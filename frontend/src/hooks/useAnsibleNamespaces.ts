import { useState, useEffect } from 'react';
import { ansibleApiService } from '../services/ansibleApiService';
import { userPreferencesService } from '../services/userPreferencesService';

interface Namespace {
  name: string;
  collection_count: number;
  collections: string[];
  total_downloads?: number;
  description?: string;
  url?: string;
}

export const useAnsibleNamespaces = (version: string) => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [favoriteNamespaces, setFavoriteNamespaces] = useState<Namespace[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Standard favorites (always included)
  const standardNamespaces = ['community', 'ansible', 'containers'];

  // Load user favorites
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const userFavorites = await userPreferencesService.getFavoriteNamespaces();
        setFavorites(userFavorites);
      } catch (error) {
        console.error('Failed to load user favorites:', error);
      }
    };

    loadFavorites();
  }, []);

  // Fetch namespaces when version changes
  useEffect(() => {
    if (!version) {
      setNamespaces([]);
      setFavoriteNamespaces([]);
      return;
    }

    const fetchNamespaces = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set version on the service before fetching
        ansibleApiService.setVersion(version);
        const namespaces = await ansibleApiService.getAllNamespaces();

        // Transform API response to match Namespace interface (collections_count -> collection_count)
        const transformedNamespaces: Namespace[] = namespaces.map(ns => ({
          name: ns.name,
          collection_count: ns.collections_count,
          collections: ns.collections,
        }));
        setNamespaces(transformedNamespaces);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch namespaces';
        setError(errorMessage);
        console.error(`Error fetching namespaces for Ansible ${version}:`, err);
        setNamespaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNamespaces();
  }, [version]);

  // Update favorite namespaces when favorites or namespaces change
  useEffect(() => {
    if (namespaces.length > 0) {
      const combinedFavoriteNames = [...standardNamespaces, ...favorites];
      
      const foundNamespaces: Namespace[] = [];
      
      combinedFavoriteNames.forEach(name => {
        const namespace = namespaces.find(ns => ns.name === name);
        if (namespace && !foundNamespaces.some(ns => ns.name === namespace.name)) {
          foundNamespaces.push(namespace);
        }
      });
      
      setFavoriteNamespaces(foundNamespaces);
    }
  }, [favorites, namespaces, standardNamespaces]);

  const handleToggleFavorite = async (namespaceName: string) => {
    try {
      const isCurrentlyFavorite = await userPreferencesService.isFavoriteNamespace(namespaceName);

      if (isCurrentlyFavorite) {
        await userPreferencesService.removeFavoriteNamespace(namespaceName);
        setFavorites(prev => prev.filter(name => name !== namespaceName));
      } else {
        await userPreferencesService.addFavoriteNamespace(namespaceName);
        setFavorites(prev => [...prev, namespaceName]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const isNamespaceFavorite = (namespaceName: string): boolean => {
    return standardNamespaces.includes(namespaceName) || favorites.includes(namespaceName);
  };

  return {
    namespaces,
    favoriteNamespaces,
    favorites,
    loading,
    error,
    handleToggleFavorite,
    isNamespaceFavorite,
    standardNamespaces
  };
};