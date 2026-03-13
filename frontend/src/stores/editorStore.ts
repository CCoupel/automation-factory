import { create } from 'zustand'

export interface EditorTab {
  id: string
  title: string
  type: 'playbook' | 'role' | 'inventory' | 'variable_file' | 'template' | 'file'
  artifactId: string
  artifactPath: string
}

interface EditorState {
  tabs: EditorTab[]
  activeTabIndex: number

  openTab: (tab: Omit<EditorTab, 'id'>) => void
  closeTab: (tabId: string) => void
  setActiveTab: (index: number) => void
  closeAllTabs: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabIndex: 0,

  openTab: (tab) => {
    const { tabs } = get()
    const existingIndex = tabs.findIndex(t => t.artifactId === tab.artifactId)
    if (existingIndex >= 0) {
      set({ activeTabIndex: existingIndex })
      return
    }
    const newTab: EditorTab = { ...tab, id: `tab-${Date.now()}` }
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabIndex: state.tabs.length,
    }))
  },

  closeTab: (tabId) => {
    set(state => {
      const newTabs = state.tabs.filter(t => t.id !== tabId)
      const closedIndex = state.tabs.findIndex(t => t.id === tabId)
      let newActiveIndex = state.activeTabIndex
      if (closedIndex <= state.activeTabIndex && state.activeTabIndex > 0) {
        newActiveIndex = state.activeTabIndex - 1
      }
      if (newActiveIndex >= newTabs.length) {
        newActiveIndex = Math.max(0, newTabs.length - 1)
      }
      return { tabs: newTabs, activeTabIndex: newActiveIndex }
    })
  },

  setActiveTab: (index) => set({ activeTabIndex: index }),
  closeAllTabs: () => set({ tabs: [], activeTabIndex: 0 }),
}))
