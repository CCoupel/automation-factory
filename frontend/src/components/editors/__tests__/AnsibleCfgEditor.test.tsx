import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock useArtifactEditor
const mockSave = vi.fn()
const mockSetContent = vi.fn()
const mockEditorHook = {
  content: '[defaults]\nremote_user = ansible\ntimeout = 30\n\n[privilege_escalation]\nbecome = true\n',
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

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

import AnsibleCfgEditor from '../AnsibleCfgEditor'

beforeEach(() => {
  vi.clearAllMocks()
  mockEditorHook.isDirty = false
  mockEditorHook.loading = false
})

describe('AnsibleCfgEditor', () => {
  it('renders section headers', () => {
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('ansibleCfgDefaults')).toBeInTheDocument()
    expect(screen.getByText('ansibleCfgPrivilegeEscalation')).toBeInTheDocument()
    expect(screen.getByText('ansibleCfgConnection')).toBeInTheDocument()
    expect(screen.getByText('ansibleCfgSshConnection')).toBeInTheDocument()
  })

  it('renders custom sections accordion', () => {
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('ansibleCfgCustomSections')).toBeInTheDocument()
  })

  it('renders save button', () => {
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('save button is disabled when not dirty', () => {
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByText('Save').closest('button')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    mockEditorHook.loading = true
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays artifact path in header', () => {
    render(<AnsibleCfgEditor artifactPath="ansible.cfg" artifactId="a1" projectId="p1" />)
    expect(screen.getByText(/ansible\.cfg/)).toBeInTheDocument()
  })
})
