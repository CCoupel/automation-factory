import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
const mockEditorHook = {
  content: 'print("hello")',
  setContent: vi.fn(),
  isDirty: false,
  loading: false,
  saving: false,
  error: null,
  snackbar: { open: false, message: '', severity: 'success' as const },
  closeSnackbar: vi.fn(),
  save: vi.fn(),
}

vi.mock('../../../hooks/useArtifactEditor', () => ({
  useArtifactEditor: vi.fn(() => mockEditorHook),
}))

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

import CodeEditor from '../CodeEditor'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CodeEditor', () => {
  it('renders Monaco editor with content', () => {
    render(<CodeEditor artifactPath="script.py" artifactId="a1" projectId="p1" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveValue('print("hello")')
  })

  it('renders read-only chip', () => {
    render(<CodeEditor artifactPath="script.py" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('readOnly')).toBeInTheDocument()
  })

  it('does not render save button', () => {
    render(<CodeEditor artifactPath="script.py" artifactId="a1" projectId="p1" />)
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })

  it('shows loading spinner', () => {
    mockEditorHook.loading = true
    render(<CodeEditor artifactPath="script.py" artifactId="a1" projectId="p1" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    mockEditorHook.loading = false
  })

  it('displays artifact path in header', () => {
    render(<CodeEditor artifactPath="roles/main.yml" artifactId="a1" projectId="p1" />)
    expect(screen.getByText(/roles\/main\.yml/)).toBeInTheDocument()
  })
})
