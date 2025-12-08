import React, { createContext, useContext, useState, ReactNode } from 'react'

/**
 * Ansible Version Context - Manages current Ansible version for compatibility checking
 */
interface AnsibleVersionContextType {
  /**
   * Current Ansible version (e.g. "2.15", "2.17.1")
   */
  ansibleVersion: string

  /**
   * Update current Ansible version
   */
  setAnsibleVersion: (version: string) => void
}

const AnsibleVersionContext = createContext<AnsibleVersionContextType | undefined>(undefined)

/**
 * Hook to access Ansible version context
 * @throws Error if used outside AnsibleVersionProvider
 */
export const useAnsibleVersion = () => {
  const context = useContext(AnsibleVersionContext)
  if (!context) {
    throw new Error('useAnsibleVersion must be used within an AnsibleVersionProvider')
  }
  return context
}

/**
 * Ansible Version Provider Component
 *
 * Manages the current Ansible version setting across the application
 * Used for compatibility checking with Galaxy modules/collections
 */
export const AnsibleVersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ansibleVersion, setAnsibleVersion] = useState('2.15') // Default version

  const value: AnsibleVersionContextType = {
    ansibleVersion,
    setAnsibleVersion
  }

  return (
    <AnsibleVersionContext.Provider value={value}>
      {children}
    </AnsibleVersionContext.Provider>
  )
}