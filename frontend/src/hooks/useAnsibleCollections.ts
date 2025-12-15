import { useState, useEffect } from 'react';
import axios from 'axios';

interface Collection {
  name: string;
  description?: string;
}

interface AnsibleCollectionsResponse {
  ansible_version: string;
  collections: { [namespace: string]: string[] };
  total_namespaces: number;
  total_collections: number;
  source: string;
}

export const useAnsibleCollections = (version: string) => {
  const [collections, setCollections] = useState<{ [namespace: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!version) {
      setCollections({});
      return;
    }

    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get<AnsibleCollectionsResponse>(
          `/api/ansible/${version}/collections`
        );
        
        setCollections(response.data.collections);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections';
        setError(errorMessage);
        console.error(`Error fetching collections for Ansible ${version}:`, err);
        setCollections({});
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [version]);

  return { collections, loading, error };
};