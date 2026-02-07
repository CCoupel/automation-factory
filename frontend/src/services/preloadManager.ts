/**
 * Preload Manager - Singleton service for data preloading
 * Completely independent from React lifecycle
 */

import { ansibleApiService } from './ansibleApiService'

export interface PreloadProgress {
  phase: 'idle' | 'namespaces' | 'collections' | 'modules' | 'complete'
  namespaces: { current: number; total: number }
  collections: { current: number; total: number }
  modules: { current: number; total: number }
  currentItem: string
}

type ProgressCallback = (progress: PreloadProgress) => void
type CompleteCallback = (collections: Record<string, any[]>, modules: Record<string, any[]>) => void

const BATCH_SIZE = 20

class PreloadManager {
  private started = false
  private completed = false
  private version = ''
  private collectionsData: Record<string, any[]> = {}
  private modulesData: Record<string, any[]> = {}
  private progressCallbacks: Map<string, ProgressCallback> = new Map()
  private completeCallbacks: Map<string, CompleteCallback> = new Map()
  private callbackIdCounter = 0
  private currentProgress: PreloadProgress = {
    phase: 'idle',
    namespaces: { current: 0, total: 0 },
    collections: { current: 0, total: 0 },
    modules: { current: 0, total: 0 },
    currentItem: ''
  }

  isStarted(): boolean {
    return this.started
  }

  isCompleted(): boolean {
    return this.completed
  }

  getVersion(): string {
    return this.version
  }

  getProgress(): PreloadProgress {
    return this.currentProgress
  }

  getCollections(): Record<string, any[]> {
    return this.collectionsData
  }

  getModules(): Record<string, any[]> {
    return this.modulesData
  }

  onProgress(callback: ProgressCallback): () => void {
    const id = String(++this.callbackIdCounter)
    this.progressCallbacks.set(id, callback)
    callback(this.currentProgress)
    return () => this.progressCallbacks.delete(id)
  }

  onComplete(callback: CompleteCallback): () => void {
    const id = String(++this.callbackIdCounter)
    this.completeCallbacks.set(id, callback)
    if (this.completed) {
      callback(this.collectionsData, this.modulesData)
    }
    return () => this.completeCallbacks.delete(id)
  }

  private notifyProgress(progress: PreloadProgress): void {
    this.currentProgress = progress
    this.progressCallbacks.forEach(cb => cb(progress))
  }

  private notifyComplete(): void {
    this.completeCallbacks.forEach(cb => cb(this.collectionsData, this.modulesData))
  }

  reset(newVersion?: string): void {
    // Don't reset if version is the same
    if (newVersion && this.version === newVersion) {
      console.log(`🔍 PreloadManager: Same version ${newVersion}, no reset needed`)
      return
    }
    console.log(`🔄 PreloadManager: Resetting${newVersion ? ` for version ${newVersion}` : ''}`)
    this.started = false
    this.completed = false
    this.collectionsData = {}
    this.modulesData = {}
    if (newVersion) this.version = newVersion
    this.currentProgress = {
      phase: 'idle',
      namespaces: { current: 0, total: 0 },
      collections: { current: 0, total: 0 },
      modules: { current: 0, total: 0 },
      currentItem: ''
    }
    this.notifyProgress(this.currentProgress)
  }

  async startPreload(namespaces: string[], version: string): Promise<void> {
    // If already completed with same version, skip
    if (this.completed && this.version === version) {
      console.log(`🔍 PreloadManager: Already completed for version ${version}, skipping`)
      return
    }

    // If started but version changed, let reset handle it first
    if (this.started && this.version !== version) {
      console.log(`🔍 PreloadManager: Version changed from ${this.version} to ${version}, waiting for reset`)
      return
    }

    // If already started with same version, skip
    if (this.started) {
      console.log(`🔍 PreloadManager: Already started for version ${version}, skipping`)
      return
    }

    this.started = true
    this.version = version
    const startVersion = version  // Capture version at start for abort check

    console.log(`🚀 PreloadManager: Starting preload for version ${version}...`)

    const totalNs = namespaces.length

    this.notifyProgress({
      phase: 'namespaces',
      namespaces: { current: totalNs, total: totalNs },
      collections: { current: 0, total: 0 },
      modules: { current: 0, total: 0 },
      currentItem: 'Namespaces loaded'
    })
    await new Promise(r => setTimeout(r, 200))

    // Abort check: version changed during async operation
    if (this.version !== startVersion) {
      console.log(`⚠️ PreloadManager: Aborting preload, version changed from ${startVersion} to ${this.version}`)
      return
    }

    // Phase 2: Load collections
    this.notifyProgress({
      ...this.currentProgress,
      phase: 'collections',
      currentItem: ''
    })

    for (let i = 0; i < namespaces.length; i += BATCH_SIZE) {
      // Abort check in collections loop
      if (this.version !== startVersion) {
        console.log(`⚠️ PreloadManager: Aborting collections, version changed to ${this.version}`)
        return
      }

      const batch = namespaces.slice(i, i + BATCH_SIZE)
      this.notifyProgress({
        ...this.currentProgress,
        collections: { current: Math.min(i + BATCH_SIZE, totalNs), total: totalNs },
        currentItem: batch.join(', ')
      })

      const results = await Promise.all(
        batch.map(async ns => {
          try {
            const cols = await ansibleApiService.getCollections(ns)
            return { ns, cols }
          } catch {
            return { ns, cols: null }
          }
        })
      )
      results.forEach(({ ns, cols }) => {
        if (cols) this.collectionsData[ns] = cols
      })
    }

    // Abort check before Phase 3
    if (this.version !== startVersion) {
      console.log(`⚠️ PreloadManager: Aborting before modules, version changed to ${this.version}`)
      return
    }

    // Phase 3: Load modules
    const colIds = Object.entries(this.collectionsData).flatMap(([ns, cols]) =>
      cols.map((c: any) => `${ns}.${c.name}`)
    )
    const totalCols = colIds.length

    this.notifyProgress({
      phase: 'modules',
      namespaces: { current: totalNs, total: totalNs },
      collections: { current: totalNs, total: totalNs },
      modules: { current: 0, total: totalCols },
      currentItem: ''
    })

    for (let i = 0; i < colIds.length; i += BATCH_SIZE) {
      // Abort check in modules loop
      if (this.version !== startVersion) {
        console.log(`⚠️ PreloadManager: Aborting modules, version changed to ${this.version}`)
        return
      }

      const batch = colIds.slice(i, i + BATCH_SIZE)
      const batchName = batch.length <= 3 ? batch.join(', ') : `${batch[0]} ... ${batch[batch.length - 1]}`
      this.notifyProgress({
        ...this.currentProgress,
        modules: { current: Math.min(i + BATCH_SIZE, totalCols), total: totalCols },
        currentItem: batchName
      })

      const results = await Promise.all(
        batch.map(async cid => {
          const [ns, col] = cid.split('.')
          try {
            const mods = await ansibleApiService.getModules(ns, col)
            return { cid, mods }
          } catch {
            return { cid, mods: null }
          }
        })
      )
      results.forEach(({ cid, mods }) => {
        if (mods) this.modulesData[cid] = mods
      })
    }

    // Final abort check before completion
    if (this.version !== startVersion) {
      console.log(`⚠️ PreloadManager: Aborting before completion, version changed to ${this.version}`)
      return
    }

    // Complete
    this.completed = true
    this.notifyProgress({
      phase: 'complete',
      namespaces: { current: totalNs, total: totalNs },
      collections: { current: totalNs, total: totalNs },
      modules: { current: totalCols, total: totalCols },
      currentItem: 'Ready'
    })
    this.notifyComplete()

    console.log(`✅ PreloadManager: Complete for version ${version} - ${Object.keys(this.collectionsData).length} namespaces, ${Object.keys(this.modulesData).length} collections`)
  }
}

// Export singleton instance
export const preloadManager = new PreloadManager()
