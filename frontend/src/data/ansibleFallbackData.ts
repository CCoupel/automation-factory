/**
 * Ansible Fallback Data
 *
 * Static fallback data used when the backend API is unavailable.
 * This ensures the UI remains functional even during backend outages.
 */

import { AnsibleNamespace, AnsibleModule, AnsibleCollectionObject } from '../services/ansibleApiService'

// ============================================================================
// Fallback Versions
// ============================================================================

export const FALLBACK_VERSIONS: string[] = ['13', '12', '11', '10', '9']

// ============================================================================
// Fallback Namespaces
// ============================================================================

export const FALLBACK_NAMESPACES: AnsibleNamespace[] = [
  { name: 'ansible', collections: ['builtin', 'posix', 'netcommon', 'utils', 'windows'], collections_count: 5 },
  { name: 'community', collections: ['general', 'crypto', 'docker', 'mysql', 'postgresql', 'vmware', 'network', 'windows'], collections_count: 8 },
  { name: 'kubernetes', collections: ['core'], collections_count: 1 },
  { name: 'amazon', collections: ['aws'], collections_count: 1 },
  { name: 'azure', collections: ['azcollection'], collections_count: 1 },
  { name: 'google', collections: ['cloud'], collections_count: 1 },
  { name: 'redhat', collections: ['openshift', 'rhel_system_roles'], collections_count: 2 },
  { name: 'cisco', collections: ['ios', 'nxos', 'aci', 'meraki'], collections_count: 4 },
  { name: 'arista', collections: ['eos'], collections_count: 1 },
  { name: 'junipernetworks', collections: ['junos'], collections_count: 1 },
  { name: 'f5networks', collections: ['f5_modules'], collections_count: 1 },
  { name: 'vmware', collections: ['vmware_rest'], collections_count: 1 }
]

// ============================================================================
// Fallback Collections (by namespace)
// ============================================================================

export const FALLBACK_COLLECTIONS: Record<string, string[]> = {
  'ansible': ['builtin', 'posix', 'netcommon', 'utils', 'windows'],
  'community': ['general', 'crypto', 'docker', 'mysql', 'postgresql', 'vmware', 'network', 'windows'],
  'kubernetes': ['core'],
  'amazon': ['aws'],
  'azure': ['azcollection'],
  'google': ['cloud'],
  'redhat': ['openshift', 'rhel_system_roles'],
  'cisco': ['ios', 'nxos', 'aci', 'meraki'],
  'arista': ['eos'],
  'junipernetworks': ['junos'],
  'f5networks': ['f5_modules'],
  'vmware': ['vmware_rest']
}

// ============================================================================
// Fallback Modules (by namespace.collection)
// ============================================================================

export const FALLBACK_MODULES: Record<string, AnsibleModule[]> = {
  'ansible.builtin': [
    { name: 'copy', description: 'Copy files to remote locations', href: '#' },
    { name: 'template', description: 'Template a file out to a target host', href: '#' },
    { name: 'file', description: 'Manage files and file properties', href: '#' },
    { name: 'command', description: 'Execute commands on targets', href: '#' },
    { name: 'shell', description: 'Execute shell commands on targets', href: '#' },
    { name: 'debug', description: 'Print statements during execution', href: '#' },
    { name: 'fail', description: 'Fail with custom message', href: '#' },
    { name: 'set_fact', description: 'Set host variable(s) and fact(s)', href: '#' },
    { name: 'lineinfile', description: 'Manage lines in text files', href: '#' },
    { name: 'yum', description: 'Manage packages with yum', href: '#' },
    { name: 'apt', description: 'Manage apt packages', href: '#' },
    { name: 'service', description: 'Manage services', href: '#' },
    { name: 'user', description: 'Manage user accounts', href: '#' },
    { name: 'group', description: 'Manage groups', href: '#' },
    { name: 'ping', description: 'Try to connect to host', href: '#' },
    { name: 'setup', description: 'Gather facts about remote hosts', href: '#' }
  ],
  'community.general': [
    { name: 'timezone', description: 'Configure timezone setting', href: '#' },
    { name: 'parted', description: 'Configure block device partitions', href: '#' },
    { name: 'lvol', description: 'Configure LVM logical volumes', href: '#' },
    { name: 'nmcli', description: 'Manage NetworkManager connections', href: '#' },
    { name: 'ufw', description: 'Manage UFW firewall', href: '#' }
  ],
  'community.docker': [
    { name: 'docker_container', description: 'Manage Docker containers', href: '#' },
    { name: 'docker_image', description: 'Manage Docker images', href: '#' },
    { name: 'docker_network', description: 'Manage Docker networks', href: '#' },
    { name: 'docker_volume', description: 'Manage Docker volumes', href: '#' },
    { name: 'docker_compose', description: 'Manage Docker Compose', href: '#' }
  ],
  'kubernetes.core': [
    { name: 'k8s', description: 'Manage Kubernetes objects', href: '#' },
    { name: 'k8s_info', description: 'Describe Kubernetes objects', href: '#' },
    { name: 'helm', description: 'Manage Helm charts', href: '#' },
    { name: 'k8s_exec', description: 'Execute commands in pods', href: '#' }
  ],
  'amazon.aws': [
    { name: 'ec2_instance', description: 'Manage EC2 instances', href: '#' },
    { name: 's3_bucket', description: 'Manage S3 buckets', href: '#' },
    { name: 'ec2_vpc_net', description: 'Manage VPCs', href: '#' },
    { name: 'ec2_security_group', description: 'Manage security groups', href: '#' },
    { name: 'iam_role', description: 'Manage IAM roles', href: '#' }
  ]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get fallback collections for a namespace
 */
export function getFallbackCollectionsForNamespace(namespace: string): string[] {
  return FALLBACK_COLLECTIONS[namespace] || ['default']
}

/**
 * Get fallback modules for a namespace.collection
 */
export function getFallbackModulesForCollection(namespace: string, collection: string): AnsibleModule[] {
  const key = `${namespace}.${collection}`
  return FALLBACK_MODULES[key] || [
    { name: 'module1', description: `Module for ${key}`, href: '#' },
    { name: 'module2', description: `Module for ${key}`, href: '#' },
    { name: 'module3', description: `Module for ${key}`, href: '#' }
  ]
}

/**
 * Create a collection object from name and namespace
 */
export function createFallbackCollectionObject(name: string, namespace: string): AnsibleCollectionObject {
  return {
    name,
    description: `${namespace}.${name} collection`,
    latest_version: '1.0.0',
    download_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    requires_ansible: undefined,
    deprecated: false
  }
}
