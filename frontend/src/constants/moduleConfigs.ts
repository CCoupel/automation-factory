/**
 * Module Configuration Constants
 *
 * Static configuration for Ansible modules that don't have Galaxy schemas.
 * Used as fallback when module schema is not available from Galaxy API.
 */

export interface ModuleParameterConfig {
  name: string
  type: string
  required: boolean
  description: string
  default?: string
}

/**
 * Legacy static configuration for common Ansible modules.
 * These are used when Galaxy schema is not available.
 */
export const moduleConfigs: Record<string, ModuleParameterConfig[]> = {
  copy: [
    { name: 'src', type: 'text', required: true, description: 'Source file path' },
    { name: 'dest', type: 'text', required: true, description: 'Destination file path' },
    { name: 'owner', type: 'text', required: false, description: 'File owner' },
    { name: 'group', type: 'text', required: false, description: 'File group' },
    { name: 'mode', type: 'text', required: false, description: 'File permissions', default: '0644' },
    { name: 'backup', type: 'select', required: false, description: 'Create a backup file', default: 'no' },
  ],
  service: [
    { name: 'name', type: 'text', required: true, description: 'Service name' },
    { name: 'state', type: 'select', required: true, description: 'Service state', default: 'started' },
    { name: 'enabled', type: 'select', required: false, description: 'Enable on boot', default: 'yes' },
  ],
  file: [
    { name: 'path', type: 'text', required: true, description: 'File or directory path' },
    { name: 'state', type: 'select', required: false, description: 'File state', default: 'file' },
    { name: 'owner', type: 'text', required: false, description: 'File owner' },
    { name: 'group', type: 'text', required: false, description: 'File group' },
    { name: 'mode', type: 'text', required: false, description: 'File permissions' },
  ],
}

/**
 * Get module configuration by name.
 * Returns empty array if module is not configured.
 */
export function getModuleConfig(moduleName: string): ModuleParameterConfig[] {
  return moduleConfigs[moduleName] || []
}
