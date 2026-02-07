import { useState, useEffect } from 'react';
import { ansibleApiService } from '../services/ansibleApiService';
import { useAnsibleVersion } from '../contexts/AnsibleVersionContext';

/**
 * Hook for managing Ansible versions
 * Uses AnsibleVersionContext for shared state across components
 */
export const useAnsibleVersions = () => {
  // Use shared context for selectedVersion
  const { ansibleVersion, setAnsibleVersion } = useAnsibleVersion();

  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const availableVersions = await ansibleApiService.getVersions();
        setVersions(availableVersions);
        setError(null);

        // Set first version as default only on first initialization
        if (availableVersions.length > 0 && !initialized) {
          const defaultVersion = availableVersions[0];
          setAnsibleVersion(defaultVersion);
          ansibleApiService.setVersion(defaultVersion);
          setInitialized(true);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Ansible versions';
        setError(errorMessage);
        console.error('Error fetching Ansible versions:', err);

        // Fallback versions en cas d'erreur
        setVersions(['13', '12', '11', '10', '9', '8']);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [initialized, setAnsibleVersion]);

  const selectVersion = (version: string) => {
    console.log(`🔄 useAnsibleVersions: Selecting version ${version}`);
    setAnsibleVersion(version);
    ansibleApiService.setVersion(version);
  };

  return { versions, selectedVersion: ansibleVersion, selectVersion, loading, error };
};