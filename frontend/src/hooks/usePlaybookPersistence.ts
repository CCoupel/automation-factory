import { useCallback, useEffect, useRef } from 'react'
import { usePlaybookEditorStore } from '../stores/playbookEditorStore'
import { playbookService } from '../services/playbookService'
import { useAuth } from '../contexts/AuthContext'
import { Play } from '../types/playbook'
import { ProjectUpdate } from './useProjectWebSocket'

const PLAYBOOK_CACHE_KEY = 'automation-factory-playbook-cache'

// Helper to ensure START modules exist in a play's modules
const ensureStartModules = (playId: string, modules: any[]): any[] => {
  const sections = ['pre_tasks', 'tasks', 'post_tasks', 'handlers'] as const
  const requiredStartIds = sections.map(s => `${playId}-start-${s.replace('_', '-')}`)
  const existingStartIds = new Set(modules.filter(m => m.isPlay).map(m => m.id))

  const missingStartModules = sections
    .filter((_, i) => !existingStartIds.has(requiredStartIds[i]))
    .map(section => ({
      id: `${playId}-start-${section.replace('_', '-')}`,
      collection: 'ansible.generic',
      name: 'start',
      description: `Start point for ${section.replace('_', ' ')}`,
      taskName: 'START',
      x: 50,
      y: 20,
      isPlay: true,
      parentSection: section,
    }))

  return [...missingStartModules, ...modules]
}

export const usePlaybookPersistence = (targetPlaybookId?: string) => {
  const { isAuthenticated } = useAuth()
  const hasRestoredFromCache = useRef(false)

  const store = usePlaybookEditorStore

  // Save to sessionStorage cache
  const saveToCache = useCallback(() => {
    const state = store.getState()
    if (!state.currentPlaybookId) return
    try {
      const cacheData = {
        id: state.currentPlaybookId,
        name: state.playbookName,
        plays: state.plays,
        collapsedBlocks: Array.from(state.collapsedBlocks),
        collapsedBlockSections: Array.from(state.collapsedBlockSections),
        timestamp: Date.now(),
      }
      sessionStorage.setItem(PLAYBOOK_CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
      console.warn('Failed to cache playbook:', e)
    }
  }, [])

  // Persist playbook ID and name in sessionStorage
  useEffect(() => {
    const unsub = store.subscribe(
      (state) => {
        if (state.currentPlaybookId) {
          sessionStorage.setItem('currentPlaybookId', state.currentPlaybookId)
        } else {
          sessionStorage.removeItem('currentPlaybookId')
        }
        sessionStorage.setItem('currentPlaybookName', state.playbookName)
      }
    )
    return unsub
  }, [])

  // Save to cache when state changes (debounced)
  useEffect(() => {
    const unsub = store.subscribe(() => {
      const state = store.getState()
      if (!state.currentPlaybookId) return
      const timer = setTimeout(saveToCache, 500)
      // Store cleanup function - will be called on next change
      return () => clearTimeout(timer)
    })
    return unsub
  }, [saveToCache])

  // Load a specific playbook by ID
  const loadPlaybook = useCallback(async (playbookId: string) => {
    // Reset lastFullSyncAt so stale timestamps from a previous artifact don't
    // trigger the race-condition guard for this load. Only a full_sync received
    // *during* this load (timestamp > loadStartedAt) should block the update.
    store.setState({ lastFullSyncAt: null })

    const loadStartedAt = Date.now()

    try {
      const detailed = await playbookService.getPlaybook(playbookId)

      // If a full_sync was applied while we were loading, don't overwrite the synced state
      const { lastFullSyncAt } = store.getState()
      if (lastFullSyncAt !== null && lastFullSyncAt > loadStartedAt) {
        store.getState().setCurrentPlaybookId(detailed.id)
        store.getState().setPlaybookName(detailed.name)
        return
      }

      const content = detailed.content
      let restoredPlays: Play[] = []

      if (content.plays && content.plays.length > 0) {
        restoredPlays = content.plays.map(play => {
          // Filter modules belonging to this play (tagged with playId during serialization)
          const playModules = content.modules.filter(
            (m: any) => m.playId === play.id || !m.playId
          )
          const modulesWithStarts = ensureStartModules(play.id, playModules)

          return {
            id: play.id,
            name: play.name,
            modules: modulesWithStarts,
            links: content.links,
            variables: content.variables.map(v => ({
              key: v.name,
              value: v.value,
              type: (v as any).type || 'string',
              required: (v as any).required !== undefined ? (v as any).required : true,
              ...((v as any).defaultValue && { defaultValue: (v as any).defaultValue }),
              ...((v as any).regexp && { regexp: (v as any).regexp }),
            })),
            attributes: play.attributes || {
              hosts: play.hosts || 'all',
              remoteUser: play.remoteUser,
              gatherFacts: play.gatherFacts !== undefined ? play.gatherFacts : true,
              become: play.become || false,
              connection: play.connection || 'ssh',
              roles: [],
            },
          }
        })
      }

      // If the playbook has no plays yet, reset the store first so the editor
      // starts from a clean default state (avoids inheriting previous plays)
      if (restoredPlays.length === 0) {
        store.getState().resetStore()
      }

      store.getState().loadPlaybookState({
        plays: restoredPlays.length > 0 ? restoredPlays : store.getState().plays,
        currentPlaybookId: detailed.id,
        playbookName: detailed.name,
        collapsedBlocks: content.collapsedBlocks,
        collapsedBlockSections: content.collapsedBlockSections,
      })

      // Replay event deltas on top of the snapshot
      const eventsDelta = (detailed as any).events_delta
      if (Array.isArray(eventsDelta) && eventsDelta.length > 0) {
        const { applyCollaborationUpdate } = store.getState()
        for (const event of eventsDelta) {
          const update: ProjectUpdate = {
            type: 'update',
            update_type: event.event_type,
            data: event.data || {},
            user_id: event.user_id || '',
            username: '',
            timestamp: event.created_at || '',
          }
          applyCollaborationUpdate(update)
        }
        console.log(`[Persistence] Replayed ${eventsDelta.length} event(s) on top of snapshot`)
      }
    } catch (error) {
      console.error('Failed to load playbook:', error)
    }
  }, [])

  // Load playbook on mount - try cache first for instant restore
  // Skip entirely when targetPlaybookId is provided: the caller handles loading explicitly
  useEffect(() => {
    if (!isAuthenticated) return
    if (hasRestoredFromCache.current) return
    if (targetPlaybookId) {
      hasRestoredFromCache.current = true
      return
    }

    const tryRestoreFromCache = (): boolean => {
      try {
        const cached = sessionStorage.getItem(PLAYBOOK_CACHE_KEY)
        if (!cached) return false

        const cacheData = JSON.parse(cached)
        const cacheAge = Date.now() - cacheData.timestamp
        if (cacheAge > 5 * 60 * 1000) {
          console.log('[Persistence] Cache expired, will reload from API')
          return false
        }

        console.log('[Persistence] Restoring playbook from cache:', cacheData.name)
        store.getState().loadPlaybookState({
          plays: cacheData.plays,
          currentPlaybookId: cacheData.id,
          playbookName: cacheData.name,
          collapsedBlocks: cacheData.collapsedBlocks,
          collapsedBlockSections: cacheData.collapsedBlockSections,
        })
        hasRestoredFromCache.current = true
        return true
      } catch (e) {
        console.warn('[Persistence] Failed to restore from cache:', e)
        return false
      }
    }

    if (tryRestoreFromCache()) return

    const loadLastPlaybook = async () => {
      try {
        const playbooks = await playbookService.listPlaybooks()
        if (playbooks.length > 0) {
          await loadPlaybook(playbooks[0].id)
          hasRestoredFromCache.current = true
        }
      } catch (error) {
        console.error('Failed to load playbook:', error)
      }
    }

    loadLastPlaybook()
  }, [isAuthenticated, loadPlaybook])

  return { loadPlaybook }
}
