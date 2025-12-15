import { useState, useEffect } from 'react';
import { ansibleService } from '../services/ansibleService';
import { 
  getUserFavorites, 
  addFavorite, 
  removeFavorite, 
  isFavorite
} from '../services/userPreferencesService';

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
        const userFavorites = await getUserFavorites();
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
        
        const response = await ansibleService.getNamespaces(version);
        setNamespaces(response.namespaces);
        
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
      const isCurrentlyFavorite = await isFavorite(namespaceName);
      
      if (isCurrentlyFavorite) {
        await removeFavorite(namespaceName);
        setFavorites(prev => prev.filter(name => name !== namespaceName));
      } else {
        await addFavorite(namespaceName);
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