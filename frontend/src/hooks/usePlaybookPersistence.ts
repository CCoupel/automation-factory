import { useCallback, useEffect, useRef } from 'react'
import { usePlaybookEditorStore } from '../stores/playbookEditorStore'
import { playbookService } from '../services/playbookService'
import { useAuth } from '../contexts/AuthContext'
import { Play } from '../types/playbook'

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

export const usePlaybookPersistence = () => {
  const { isAuthenticated } = useAuth()
  const hasRestoredFromCache = useRef(false)
  const hasLoaded = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Save playbook to backend
  const savePlaybook = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping save')
      return
    }

    if (!hasLoaded.current) {
      console.log('[Persistence] Skipping save — data not loaded yet')
      return
    }

    const state = store.getState()

    if (!state.currentPlaybookId) {
      console.log('[Persistence] Skipping save — no playbook loaded')
      return
    }

    state.setSaveStatus('saving')

    try {
      const content = state.serializePlaybookContent()

      if (state.currentPlaybookId) {
        await playbookService.updatePlaybook(state.currentPlaybookId, {
          name: state.playbookName,
          content,
        })
      } else {
        const newPlaybook = await playbookService.createPlaybook({
          name: state.playbookName,
          content,
        })
        state.setCurrentPlaybookId(newPlaybook.id)
      }

      state.setSaveStatus('saved')
      state.setLastSavedAt(new Date())

      setTimeout(() => store.getState().setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save playbook:', error)
      store.getState().setSaveStatus('error')
      setTimeout(() => store.getState().setSaveStatus('idle'), 3000)
    }
  }, [isAuthenticated])

  // Load a specific playbook by ID
  const loadPlaybook = useCallback(async (playbookId: string) => {
    // Cancel any pending auto-save to prevent overwriting with stale state
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    try {
      const detailed = await playbookService.getPlaybook(playbookId)

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

      store.getState().loadPlaybookState({
        plays: restoredPlays,
        currentPlaybookId: detailed.id,
        playbookName: detailed.name,
        collapsedBlocks: content.collapsedBlocks,
        collapsedBlockSections: content.collapsedBlockSections,
      })

      hasLoaded.current = true
    } catch (error) {
      console.error('Failed to load playbook:', error)
    }
  }, [])

  // Auto-save with debounce (only after data has been loaded)
  // Filter out saveStatus/lastSavedAt changes to avoid save -> status change -> save loop
  useEffect(() => {
    if (!isAuthenticated) return

    let prevSaveStatus = store.getState().saveStatus
    let prevLastSavedAt = store.getState().lastSavedAt

    const unsub = store.subscribe(() => {
      if (!hasLoaded.current) return

      const state = store.getState()
      // Skip if only saveStatus or lastSavedAt changed (avoids infinite loop)
      if (state.saveStatus !== prevSaveStatus || state.lastSavedAt !== prevLastSavedAt) {
        prevSaveStatus = state.saveStatus
        prevLastSavedAt = state.lastSavedAt
        return
      }

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null
        savePlaybook()
      }, 3000)
    })

    return () => {
      unsub()
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [isAuthenticated, savePlaybook])

  // Load playbook on mount - try cache first for instant restore
  useEffect(() => {
    if (!isAuthenticated) return
    if (hasRestoredFromCache.current) return

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

        // Cancel any pending auto-save before restoring
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current)
          autoSaveTimerRef.current = null
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
        hasLoaded.current = true
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

  return { savePlaybook, loadPlaybook }
}
