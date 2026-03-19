import { create } from 'zustand'
import { projectService, Project, ProjectArtifact, ProjectCreate, ProjectArtifactCreate, ProjectArtifactUpdate } from '../services/projectService'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  artifacts: ProjectArtifact[]
  selectedArtifactId: string | null
  isLoading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  fetchArtifacts: (projectId: string) => Promise<void>
  createProject: (data: ProjectCreate) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  createArtifact: (projectId: string, data: ProjectArtifactCreate) => Promise<ProjectArtifact>
  updateArtifact: (projectId: string, artifactId: string, data: ProjectArtifactUpdate) => Promise<ProjectArtifact>
  deleteArtifact: (projectId: string, artifactId: string) => Promise<void>
  setSelectedArtifact: (id: string | null) => void
  clearCurrentProject: () => void
  clearError: () => void
  applyArtifactAdd: (artifact: ProjectArtifact) => void
  applyArtifactUpdate: (artifact: ProjectArtifact) => void
  applyArtifactDelete: (artifactId: string) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  artifacts: [],
  selectedArtifactId: null,
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

  createArtifact: async (projectId: string, data: ProjectArtifactCreate) => {
    set({ error: null })
    try {
      const artifact = await projectService.createArtifact(projectId, data)
      set(state => ({
        artifacts: [...state.artifacts, artifact],
      }))
      return artifact
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },

  updateArtifact: async (projectId: string, artifactId: string, data: ProjectArtifactUpdate) => {
    set({ error: null })
    try {
      const artifact = await projectService.updateArtifact(projectId, artifactId, data)
      set(state => ({
        artifacts: state.artifacts.map(a => a.id === artifactId ? artifact : a),
      }))
      return artifact
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },

  deleteArtifact: async (projectId: string, artifactId: string) => {
    set({ error: null })
    try {
      await projectService.deleteArtifact(projectId, artifactId)
      set(state => ({
        artifacts: state.artifacts.filter(a => a.id !== artifactId),
        selectedArtifactId: state.selectedArtifactId === artifactId ? null : state.selectedArtifactId,
      }))
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  },

  setSelectedArtifact: (id: string | null) => set({ selectedArtifactId: id }),

  clearCurrentProject: () => set({ currentProject: null, artifacts: [], selectedArtifactId: null }),
  clearError: () => set({ error: null }),

  applyArtifactAdd: (artifact: ProjectArtifact) => set(state => ({
    artifacts: state.artifacts.some(a => a.id === artifact.id)
      ? state.artifacts
      : [...state.artifacts, artifact],
  })),

  applyArtifactUpdate: (artifact: ProjectArtifact) => set(state => ({
    artifacts: state.artifacts.map(a => a.id === artifact.id ? artifact : a),
  })),

  applyArtifactDelete: (artifactId: string) => set(state => ({
    artifacts: state.artifacts.filter(a => a.id !== artifactId),
    selectedArtifactId: state.selectedArtifactId === artifactId ? null : state.selectedArtifactId,
  })),
}))
