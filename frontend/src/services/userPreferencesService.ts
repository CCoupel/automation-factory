/**
 * Service for managing user preferences API calls
 */

import { getHttpClient } from '../utils/httpClient';

export interface UserPreferences {
  id: string;
  user_id: string;
  favorite_namespaces: string[];
  interface_settings: Record<string, any>;
  galaxy_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FavoriteNamespaceRequest {
  namespace: string;
}

export interface FavoriteNamespaceResponse {
  success: boolean;
  message: string;
  favorite_namespaces: string[];
}

export interface InterfaceSettingRequest {
  key: string;
  value: any;
}

export interface InterfaceSettingResponse {
  success: boolean;
  message: string;
  interface_settings: Record<string, any>;
}

export interface FavoriteCollectionResponse {
  success: boolean;
  message: string;
  favorite_collections: string[];
}

export interface FavoriteModuleResponse {
  success: boolean;
  message: string;
  favorite_modules: string[];
}

/**
 * User Preferences Service
 * 
 * Manages user-specific preferences including favorite namespaces
 * and interface settings
 */
class UserPreferencesService {
  private httpClient = getHttpClient();
  private cache: UserPreferences | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user preferences with caching
   */
  async getUserPreferences(): Promise<UserPreferences> {
    const now = Date.now();
    
    // Return cached data if valid
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const response = await this.httpClient.get<UserPreferences>('/user/preferences');
      this.cache = response.data;
      this.cacheTimestamp = now;
      return this.cache;
    } catch (error: any) {
      console.error('Failed to fetch user preferences:', error);
      throw new Error(`Failed to fetch preferences: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Update user preferences (partial update)
   */
  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await this.httpClient.patch<UserPreferences>('/user/preferences', updates);
      this.cache = response.data;
      this.cacheTimestamp = Date.now();
      return this.cache;
    } catch (error: any) {
      console.error('Failed to update user preferences:', error);
      throw new Error(`Failed to update preferences: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Add namespace to favorites
   */
  async addFavoriteNamespace(namespace: string): Promise<FavoriteNamespaceResponse> {
    try {
      const request: FavoriteNamespaceRequest = { namespace: namespace.trim() };
      const response = await this.httpClient.post<FavoriteNamespaceResponse>('/user/favorites', request);
      
      // Update cache
      if (this.cache) {
        this.cache.favorite_namespaces = response.data.favorite_namespaces;
        this.cacheTimestamp = Date.now();
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to add favorite namespace:', error);
      throw new Error(`Failed to add favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Remove namespace from favorites
   */
  async removeFavoriteNamespace(namespace: string): Promise<FavoriteNamespaceResponse> {
    try {
      const response = await this.httpClient.delete<FavoriteNamespaceResponse>(`/user/favorites/${encodeURIComponent(namespace.trim())}`);
      
      // Update cache
      if (this.cache) {
        this.cache.favorite_namespaces = response.data.favorite_namespaces;
        this.cacheTimestamp = Date.now();
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to remove favorite namespace:', error);
      throw new Error(`Failed to remove favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get favorite namespaces (simplified for file-based API)
   */
  async getFavoriteNamespaces(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<FavoriteNamespaceResponse>('/user/favorites');
      return response.data.favorite_namespaces || [];
    } catch (error: any) {
      console.error('Failed to get favorite namespaces:', error);
      // Return empty array on error to allow UI to function
      return [];
    }
  }

  /**
   * Check if namespace is favorite
   */
  async isFavoriteNamespace(namespace: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences();
      return preferences.favorite_namespaces.includes(namespace);
    } catch (error) {
      console.warn('Failed to check if namespace is favorite:', error);
      return false;
    }
  }

  // ==================== COLLECTION FAVORITES ====================

  /**
   * Get favorite collections from database
   */
  async getFavoriteCollections(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<FavoriteCollectionResponse>('/user/favorites/collections');
      return response.data.favorite_collections || [];
    } catch (error: any) {
      console.error('Failed to get favorite collections:', error);
      return [];
    }
  }

  /**
   * Add collection to favorites
   */
  async addFavoriteCollection(collection: string): Promise<FavoriteCollectionResponse> {
    try {
      const response = await this.httpClient.post<FavoriteCollectionResponse>('/user/favorites/collections', { collection: collection.trim() });
      this.invalidateCache();
      return response.data;
    } catch (error: any) {
      console.error('Failed to add favorite collection:', error);
      throw new Error(`Failed to add favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Remove collection from favorites
   */
  async removeFavoriteCollection(collection: string): Promise<FavoriteCollectionResponse> {
    try {
      const response = await this.httpClient.delete<FavoriteCollectionResponse>(`/user/favorites/collections/${encodeURIComponent(collection.trim())}`);
      this.invalidateCache();
      return response.data;
    } catch (error: any) {
      console.error('Failed to remove favorite collection:', error);
      throw new Error(`Failed to remove favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  // ==================== MODULE FAVORITES ====================

  /**
   * Get favorite modules from database
   */
  async getFavoriteModules(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<FavoriteModuleResponse>('/user/favorites/modules');
      return response.data.favorite_modules || [];
    } catch (error: any) {
      console.error('Failed to get favorite modules:', error);
      return [];
    }
  }

  /**
   * Add module to favorites
   */
  async addFavoriteModule(module: string): Promise<FavoriteModuleResponse> {
    try {
      const response = await this.httpClient.post<FavoriteModuleResponse>('/user/favorites/modules', { module: module.trim() });
      this.invalidateCache();
      return response.data;
    } catch (error: any) {
      console.error('Failed to add favorite module:', error);
      throw new Error(`Failed to add favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Remove module from favorites
   */
  async removeFavoriteModule(module: string): Promise<FavoriteModuleResponse> {
    try {
      const response = await this.httpClient.delete<FavoriteModuleResponse>(`/user/favorites/modules/${encodeURIComponent(module.trim())}`);
      this.invalidateCache();
      return response.data;
    } catch (error: any) {
      console.error('Failed to remove favorite module:', error);
      throw new Error(`Failed to remove favorite: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Invalidate cache (forces refresh on next request)
   */
  private invalidateCache(): void {
    this.cacheTimestamp = 0;
  }

  /**
   * Set interface setting
   */
  async setInterfaceSetting(key: string, value: any): Promise<InterfaceSettingResponse> {
    try {
      const request: InterfaceSettingRequest = { key, value };
      const response = await this.httpClient.post<InterfaceSettingResponse>('/user/interface', request);
      
      // Update cache
      if (this.cache) {
        this.cache.interface_settings = response.data.interface_settings;
        this.cacheTimestamp = Date.now();
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to set interface setting:', error);
      throw new Error(`Failed to set setting: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get interface setting
   */
  async getInterfaceSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const response = await this.httpClient.get(`/user/interface/${encodeURIComponent(key)}`);
      return response.data.value !== null ? response.data.value : defaultValue;
    } catch (error) {
      console.warn(`Failed to get interface setting '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Clear cache (useful after logout)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get cached favorites if available (no API call)
   */
  getCachedFavorites(): string[] {
    return this.cache?.favorite_namespaces || [];
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();

// Export convenience functions for easier usage
export const getUserFavorites = () => userPreferencesService.getFavoriteNamespaces();
export const addFavorite = (type: 'namespace' | 'collection' | 'module', item: string) => {
  switch (type) {
    case 'namespace':
      return userPreferencesService.addFavoriteNamespace(item);
    case 'collection':
      return userPreferencesService.addFavoriteCollection(item);
    case 'module':
      return userPreferencesService.addFavoriteModule(item);
  }
};
export const removeFavorite = (type: 'namespace' | 'collection' | 'module', item: string) => {
  switch (type) {
    case 'namespace':
      return userPreferencesService.removeFavoriteNamespace(item);
    case 'collection':
      return userPreferencesService.removeFavoriteCollection(item);
    case 'module':
      return userPreferencesService.removeFavoriteModule(item);
  }
};
export const isFavorite = (type: 'namespace', namespace: string) => userPreferencesService.isFavoriteNamespace(namespace);

// Collection and module favorites
export const getCollectionFavorites = () => userPreferencesService.getFavoriteCollections();
export const getModuleFavorites = () => userPreferencesService.getFavoriteModules();