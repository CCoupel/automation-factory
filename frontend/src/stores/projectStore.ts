import { create } from 'zustand'
import { projectService, Project, ProjectArtifact, ProjectCreate } from '../services/projectService'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  artifacts: ProjectArtifact[]
  isLoading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  fetchArtifacts: (projectId: string) => Promise<void>
  createProject: (data: ProjectCreate) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  clearCurrentProject: () => void
  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  artifacts: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await projectService.listProjects()
      set({ projects, isLoading: false })
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const project = await projectService.getProject(id)
      set({ currentProject: project, isLoading: false })
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false })
    }
  },

  fetchArtifacts: async (projectId: string) => {
    try {
      const artifacts = await projectService.listArtifacts(projectId)
      set({ artifacts })
    } catch (error: unknown) {
      // Only set error if no prior error exists (avoid overwriting fetchProject errors)
      set(state => state.error ? {} : { error: error instanceof Error ? error.message : String(error) })
    }
  },

  createProject: async (data: ProjectCreate) => {
    set({ isLoading: true, error: null })
    try {
      const project = await projectService.createProject(data)
      set(state => ({
        projects: [...state.projects, project],
        isLoading: false,
      }))
      return project
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false })
      throw error
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await projectService.deleteProject(id)
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        isLoading: false,
      }))
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false })
      throw error
    }
  },

  clearCurrentProject: () => set({ currentProject: null, artifacts: [] }),
  clearError: () => set({ error: null }),
}))
