import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Monaco editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      readOnly={options?.readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

// Mock useArtifactEditor
const mockSave = vi.fn()
const mockSetContent = vi.fn()
const mockEditorHook = {
  content: 'Hello {{ name }}, welcome to {{ city }}',
  setContent: mockSetContent,
  isDirty: false,
  loading: false,
  saving: false,
  error: null,
  snackbar: { open: false, message: '', severity: 'success' as const },
  closeSnackbar: vi.fn(),
  save: mockSave,
}

vi.mock('../../../hooks/useArtifactEditor', () => ({
  useArtifactEditor: vi.fn(() => mockEditorHook),
}))

// Mock projectStore - variable_file artifacts
vi.mock('../../../stores/projectStore', () => ({
  useProjectStore: vi.fn((selector: any) => {
    const state = {
      artifacts: [
        {
          id: 'var-1',
          artifact_type: 'variable_file',
          path: 'vars/main.yml',
          raw_content: 'name: John\ncity: Paris',
        },
      ],
    }
    return selector(state)
  }),
}))

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.source) return `${key} (${opts.source})`
      return key
    },
    i18n: { language: 'en' },
  }),
}))

import TemplateEditor from '../TemplateEditor'

beforeEach(() => {
  vi.clearAllMocks()
  mockEditorHook.isDirty = false
  mockEditorHook.loading = false
})

describe('TemplateEditor', () => {
  it('renders Monaco editor with template content', () => {
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveValue('Hello {{ name }}, welcome to {{ city }}')
  })

  it('renders save button', () => {
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('save button is disabled when not dirty', () => {
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('Save').closest('button')).toBeDisabled()
  })

  it('save button is enabled when dirty', () => {
    mockEditorHook.isDirty = true
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled()
  })

  it('renders variable panel header', () => {
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('variablesPanel')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockEditorHook.loading = true
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('calls save on button click', () => {
    mockEditorHook.isDirty = true
    render(<TemplateEditor artifactPath="template.j2" artifactId="a1" projectId="p1" />)
    fireEvent.click(screen.getByText('Save'))
    expect(mockSave).toHaveBeenCalled()
  })
})
