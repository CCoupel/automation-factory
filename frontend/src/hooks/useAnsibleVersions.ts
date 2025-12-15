import { useState, useEffect } from 'react';
import { ansibleApiService } from '../services/ansibleApiService';

export const useAnsibleVersions = () => {
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('13');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const availableVersions = await ansibleApiService.getVersions();
        setVersions(availableVersions);
        setError(null);
        
        // Set first version as default if available
        if (availableVersions.length > 0) {
          const defaultVersion = availableVersions[0];
          setSelectedVersion(defaultVersion);
          ansibleApiService.setVersion(defaultVersion);
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
  }, []);

  const selectVersion = (version: string) => {
    setSelectedVersion(version);
    ansibleApiService.setVersion(version);
  };

  return { versions, selectedVersion, selectVersion, loading, error };
};