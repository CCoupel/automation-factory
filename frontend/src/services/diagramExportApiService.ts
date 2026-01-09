/**
 * Diagram Export API Service
 *
 * Calls backend API endpoints for diagram export.
 * The backend is the source of truth for export generation.
 */

import { getHttpClient } from '../utils/httpClient'
import { Play } from '../types/playbook'
import { ExportOptions, MermaidExportOptions, SVGExportOptions } from '../types/diagram-export'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ABDExportRequest {
  plays: Play[]
  playbook_name: string
  playbook_id?: string
  author?: string
  include_ui_state: boolean
  include_integrity: boolean
  pretty_print: boolean
  collapsed_blocks: string[]
  collapsed_block_sections: string[]
  collapsed_play_sections: string[]
  active_play_index: number
}

interface MermaidExportRequest {
  plays: Play[]
  playbook_name: string
  playbook_id?: string
  direction: string
  include_plays: boolean
  include_sections: boolean
  include_blocks: boolean
  as_markdown: boolean
}

interface SVGExportRequest {
  plays: Play[]
  playbook_name: string
  playbook_id?: string
  scale: number
  padding: number
  background_color: string
  collapsed_blocks: string[]
}

interface ExportResponse<T> {
  content: T
  filename: string
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export to ABD format via API
 */
export async function exportABD(
  plays: Play[],
  playbookName: string,
  options: ExportOptions & {
    playbookId?: string
    author?: string
    collapsedBlocks: string[]
    collapsedBlockSections: string[]
    collapsedPlaySections: string[]
    activePlayIndex: number
  }
): Promise<void> {
  const request: ABDExportRequest = {
    plays,
    playbook_name: playbookName,
    playbook_id: options.playbookId,
    author: options.author,
    include_ui_state: options.includeUIState !== false,
    include_integrity: options.includeIntegrity !== false,
    pretty_print: options.prettyPrint || false,
    collapsed_blocks: options.collapsedBlocks,
    collapsed_block_sections: options.collapsedBlockSections,
    collapsed_play_sections: options.collapsedPlaySections,
    active_play_index: options.activePlayIndex
  }

  const client = getHttpClient()
  const response = await client.post<ExportResponse<Record<string, unknown>>>(
    `/export/abd`,
    request
  )

  // Download the file
  const jsonString = options.prettyPrint
    ? JSON.stringify(response.data.content, null, 2)
    : JSON.stringify(response.data.content)

  downloadFile(jsonString, response.data.filename, 'application/vnd.ansible-builder.diagram+json')
}

/**
 * Export to Mermaid format via API
 */
export async function exportMermaid(
  plays: Play[],
  playbookName: string,
  options: MermaidExportOptions = {}
): Promise<void> {
  const request: MermaidExportRequest = {
    plays,
    playbook_name: playbookName,
    direction: options.direction || 'TB',
    include_plays: options.includePlays !== false,
    include_sections: options.includeSections !== false,
    include_blocks: options.includeBlocks !== false,
    as_markdown: true
  }

  const client = getHttpClient()
  const response = await client.post<ExportResponse<string>>(
    `/export/mermaid`,
    request
  )

  downloadFile(response.data.content, response.data.filename, 'text/markdown')
}

/**
 * Export to SVG format via API
 */
export async function exportSVG(
  plays: Play[],
  playbookName: string,
  options: SVGExportOptions = {}
): Promise<void> {
  const request: SVGExportRequest = {
    plays,
    playbook_name: playbookName,
    scale: options.scale || 1,
    padding: options.padding || 20,
    background_color: options.backgroundColor || '#ffffff',
    collapsed_blocks: options.collapsedBlocks || []
  }

  const client = getHttpClient()
  const response = await client.post<ExportResponse<string>>(
    `/export/svg`,
    request
  )

  downloadFile(response.data.content, response.data.filename, 'image/svg+xml')
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trigger file download in browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
