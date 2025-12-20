import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiConfig'
import { PlaybookContent, ModuleBlock, Link } from './playbookService'

/**
 * YAML preview response from backend
 */
export interface YamlPreviewResponse {
  yaml: string
  playbook_id: string | null
}

/**
 * Validation response from backend
 */
export interface ValidationResponse {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  playbook_id: string | null
}

/**
 * Ansible-format playbook structure expected by backend
 */
interface AnsiblePlaybook {
  name?: string
  hosts: string
  become?: boolean
  become_user?: string
  remote_user?: string
  connection?: string
  gather_facts?: boolean
  vars?: Record<string, any>
  vars_files?: string[]
  roles?: string[]
  pre_tasks?: AnsibleTask[]
  tasks?: AnsibleTask[]
  post_tasks?: AnsibleTask[]
  handlers?: AnsibleTask[]
}

interface AnsibleTask {
  name?: string
  module: string
  params?: Record<string, any>
  when?: string
  loop?: any
  register?: string
  ignore_errors?: boolean
  become?: boolean
  delegate_to?: string
  tags?: string[]
  block?: AnsibleTask[]
  rescue?: AnsibleTask[]
  always?: AnsibleTask[]
}

/**
 * Get authorization header with JWT token
 */
function getAuthHeader(): { Authorization: string } | Record<string, never> {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Transform a ModuleBlock to an AnsibleTask
 * Uses module direct properties for task attributes and moduleParameters for module params
 */
function moduleToTask(module: ModuleBlock): AnsibleTask {
  // Use moduleParameters for module-specific params, fallback to config for backwards compatibility
  const params = module.moduleParameters || module.config || {}

  const task: AnsibleTask = {
    name: module.taskName || module.name,
    module: `${module.collection}.${module.name}`,
    params: { ...params }
  }

  // Task attributes are stored directly on module, not in config/moduleParameters
  // when - conditional execution
  if (module.when) {
    task.when = module.when
  }

  // loop - iteration
  if (module.loop) {
    task.loop = module.loop
  }

  // register - store result in variable (from config for now)
  if (module.config?.register) {
    task.register = module.config.register
  }

  // ignore_errors - continue on failure
  if (module.ignoreErrors) {
    task.ignore_errors = module.ignoreErrors
  }

  // become - privilege escalation
  if (module.become !== undefined) {
    task.become = module.become
  }

  // delegate_to - run on different host
  if (module.delegateTo) {
    task.delegate_to = module.delegateTo
  }

  // tags - task categorization
  if (module.tags && module.tags.length > 0) {
    task.tags = module.tags
  }

  // Clean up params - remove any task-level attributes that might have been included
  const taskLevelKeys = ['when', 'loop', 'register', 'ignore_errors', 'become', 'delegate_to', 'tags']
  for (const key of taskLevelKeys) {
    if (task.params && key in task.params) {
      delete task.params[key]
    }
  }

  return task
}

/**
 * Convert a module or block to an AnsibleTask
 * Unified conversion function for both regular modules and blocks
 * Returns null if the module should be skipped
 */
function convertToAnsibleTask(
  module: ModuleBlock,
  moduleMap: Map<string, ModuleBlock>
): AnsibleTask | null {
  if (module.isPlay) return null

  if (module.isBlock) {
    // Convert block with its sections
    const blockTask = buildBlockTask(module, moduleMap)
    // Only include block if it has content in at least one section
    if (blockTask.block || blockTask.rescue || blockTask.always) {
      return blockTask
    }
    return null
  }

  // Regular module
  return moduleToTask(module)
}

/**
 * Build an Ansible block task from a block module
 * Recursively handles nested blocks
 */
function buildBlockTask(
  block: ModuleBlock,
  moduleMap: Map<string, ModuleBlock>
): AnsibleTask {
  const ansibleBlock: AnsibleTask = {
    name: block.taskName || block.name || 'Block',
    module: 'block' // Temporary marker, will be removed
  }

  // Process each block section
  const sections: Array<{ key: 'block' | 'rescue' | 'always', source: 'normal' | 'rescue' | 'always' }> = [
    { key: 'block', source: 'normal' },
    { key: 'rescue', source: 'rescue' },
    { key: 'always', source: 'always' }
  ]

  for (const { key, source } of sections) {
    const taskIds = block.blockSections?.[source] || []
    const tasks = convertTaskIds(taskIds, moduleMap)
    if (tasks.length > 0) {
      ansibleBlock[key] = tasks
    }
  }

  // Add block-level attributes
  if (block.config?.when) {
    ansibleBlock.when = block.config.when
  }
  if (block.config?.become !== undefined) {
    ansibleBlock.become = block.config.become
  }

  // Remove the temporary module marker
  delete (ansibleBlock as any).module

  return ansibleBlock
}

/**
 * Convert an array of task IDs to AnsibleTasks
 * Used by both block sections and could be extended for other use cases
 */
function convertTaskIds(
  taskIds: string[],
  moduleMap: Map<string, ModuleBlock>
): AnsibleTask[] {
  const tasks: AnsibleTask[] = []

  for (const taskId of taskIds) {
    const module = moduleMap.get(taskId)
    if (module) {
      const task = convertToAnsibleTask(module, moduleMap)
      if (task) {
        tasks.push(task)
      }
    }
  }

  return tasks
}

/**
 * Get tasks for a specific section of a play, following link order
 * Only includes tasks that are connected via links
 * Handles blocks recursively
 */
function getTasksForSection(
  modules: ModuleBlock[],
  links: Link[],
  playId: string,
  section: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
): AnsibleTask[] {
  // Find the START node for this section
  const startNode = modules.find(m =>
    m.playId === playId &&
    m.isPlay === true &&
    m.parentSection === section
  )

  if (!startNode) {
    return []
  }

  // Build a map of module ID to module for quick lookup
  const moduleMap = new Map<string, ModuleBlock>()
  modules.forEach(m => moduleMap.set(m.id, m))

  // Build adjacency list from links (only for this section's link type)
  const adjacency = new Map<string, string[]>()
  links
    .filter(link => link.type === section)
    .forEach(link => {
      if (!adjacency.has(link.from)) {
        adjacency.set(link.from, [])
      }
      adjacency.get(link.from)!.push(link.to)
    })

  // Traverse links starting from START node to build ordered task list
  const orderedTasks: AnsibleTask[] = []
  const visited = new Set<string>()

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const nextNodes = adjacency.get(nodeId) || []
    for (const nextId of nextNodes) {
      const module = moduleMap.get(nextId)
      // Skip tasks inside blocks (they're handled by convertToAnsibleTask -> buildBlockTask)
      if (module && !module.parentId) {
        const task = convertToAnsibleTask(module, moduleMap)
        if (task) {
          orderedTasks.push(task)
        }
      }
      traverse(nextId)
    }
  }

  traverse(startNode.id)

  return orderedTasks
}

/**
 * Transform frontend PlaybookContent to Ansible-format playbook
 */
function transformToAnsibleFormat(content: PlaybookContent): AnsiblePlaybook[] {
  const plays: AnsiblePlaybook[] = []

  // Handle each play
  for (const play of content.plays || []) {
    const ansiblePlay: AnsiblePlaybook = {
      name: play.name || 'Untitled Play',
      hosts: play.hosts || 'all',
      become: play.become,
      gather_facts: play.gatherFacts,
      remote_user: play.remoteUser,
      connection: play.connection
    }

    // Add variables
    if (content.variables && content.variables.length > 0) {
      ansiblePlay.vars = {}
      for (const variable of content.variables) {
        ansiblePlay.vars[variable.name] = variable.value
      }
    }

    // Get tasks for each section, following link order
    const preTasks = getTasksForSection(content.modules, content.links, play.id, 'pre_tasks')
    const tasks = getTasksForSection(content.modules, content.links, play.id, 'tasks')
    const postTasks = getTasksForSection(content.modules, content.links, play.id, 'post_tasks')
    const handlers = getTasksForSection(content.modules, content.links, play.id, 'handlers')

    if (preTasks.length > 0) ansiblePlay.pre_tasks = preTasks
    if (tasks.length > 0) ansiblePlay.tasks = tasks
    if (postTasks.length > 0) ansiblePlay.post_tasks = postTasks
    if (handlers.length > 0) ansiblePlay.handlers = handlers

    plays.push(ansiblePlay)
  }

  // If no plays defined, create a default one with all modules as tasks
  if (plays.length === 0 && content.modules && content.modules.length > 0) {
    const regularModules = content.modules.filter(m => !m.isBlock && !m.isPlay)

    if (regularModules.length > 0) {
      plays.push({
        name: content.metadata?.playbookName || 'Generated Playbook',
        hosts: 'all',
        tasks: regularModules.map(moduleToTask)
      })
    }
  }

  return plays
}

/**
 * Transform a single play structure (simpler case)
 */
function transformSinglePlayToAnsible(content: PlaybookContent): AnsiblePlaybook {
  const plays = transformToAnsibleFormat(content)

  if (plays.length > 0) {
    return plays[0]
  }

  // Return empty playbook structure
  return {
    name: content.metadata?.playbookName || 'New Playbook',
    hosts: 'all',
    tasks: []
  }
}

/**
 * Playbook Preview Service
 *
 * Handles API calls for YAML preview and validation
 */
export const playbookPreviewService = {
  /**
   * Get YAML preview for current playbook content
   * Does not require a saved playbook - works with live content
   *
   * @param content - Current playbook content from editor
   * @returns Promise with generated YAML
   */
  async getPreview(content: PlaybookContent): Promise<YamlPreviewResponse> {
    try {
      // Transform frontend format to Ansible format
      const ansibleContent = transformSinglePlayToAnsible(content)

      const response = await axios.post<YamlPreviewResponse>(
        `${getApiBaseUrl()}/playbooks/preview`,
        { content: ansibleContent },
        { headers: getAuthHeader() }
      )
      return response.data
    } catch (error: any) {
      console.error('Preview API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to generate preview')
    }
  },

  /**
   * Validate current playbook content
   * Does not require a saved playbook - works with live content
   *
   * @param content - Current playbook content from editor
   * @returns Promise with validation results
   */
  async validatePreview(content: PlaybookContent): Promise<ValidationResponse> {
    try {
      // Transform frontend format to Ansible format
      const ansibleContent = transformSinglePlayToAnsible(content)

      const response = await axios.post<ValidationResponse>(
        `${getApiBaseUrl()}/playbooks/validate-preview`,
        { content: ansibleContent },
        { headers: getAuthHeader() }
      )
      return response.data
    } catch (error: any) {
      console.error('Validation API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to validate playbook')
    }
  },

  /**
   * Get YAML for a saved playbook
   *
   * @param playbookId - ID of saved playbook
   * @returns Promise with generated YAML
   */
  async getPlaybookYaml(playbookId: string): Promise<YamlPreviewResponse> {
    try {
      const response = await axios.get<YamlPreviewResponse>(
        `${getApiBaseUrl()}/playbooks/${playbookId}/yaml`,
        { headers: getAuthHeader() }
      )
      return response.data
    } catch (error: any) {
      console.error('Get YAML API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get playbook YAML')
    }
  },

  /**
   * Validate a saved playbook
   *
   * @param playbookId - ID of saved playbook
   * @returns Promise with validation results
   */
  async validatePlaybook(playbookId: string): Promise<ValidationResponse> {
    try {
      const response = await axios.post<ValidationResponse>(
        `${getApiBaseUrl()}/playbooks/${playbookId}/validate`,
        {},
        { headers: getAuthHeader() }
      )
      return response.data
    } catch (error: any) {
      console.error('Validate API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to validate playbook')
    }
  },

  /**
   * Download YAML as a file
   *
   * @param yaml - YAML content
   * @param filename - File name (without extension)
   */
  downloadYaml(yaml: string, filename: string = 'playbook'): void {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.yml`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
