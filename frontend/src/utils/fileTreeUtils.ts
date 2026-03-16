import { ProjectArtifact } from '../services/projectService'

export interface TreeNode {
  id: string
  name: string
  path: string
  isFolder: boolean
  artifactType?: string
  children: TreeNode[]
  artifact?: ProjectArtifact
}

export function buildFileTree(artifacts: ProjectArtifact[]): TreeNode[] {
  const root: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  const getOrCreateFolder = (folderPath: string): TreeNode => {
    const existing = folderMap.get(folderPath)
    if (existing) return existing

    const parts = folderPath.split('/')
    const name = parts[parts.length - 1]

    const folder: TreeNode = {
      id: `folder:${folderPath}`,
      name,
      path: folderPath,
      isFolder: true,
      children: [],
    }
    folderMap.set(folderPath, folder)

    if (parts.length === 1) {
      root.push(folder)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = getOrCreateFolder(parentPath)
      parent.children.push(folder)
    }

    return folder
  }

  for (const artifact of artifacts) {
    // Trim trailing slashes
    const cleanPath = artifact.path.replace(/\/+$/, '')
    if (!cleanPath) continue

    const parts = cleanPath.split('/')
    const fileName = parts[parts.length - 1]

    const leaf: TreeNode = {
      id: artifact.id,
      name: fileName,
      path: cleanPath,
      isFolder: false,
      artifactType: artifact.artifact_type,
      children: [],
      artifact,
    }

    if (parts.length === 1) {
      root.push(leaf)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = getOrCreateFolder(parentPath)
      parent.children.push(leaf)
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        node.children = sortNodes(node.children)
      }
    }
    return nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  return sortNodes(root)
}
