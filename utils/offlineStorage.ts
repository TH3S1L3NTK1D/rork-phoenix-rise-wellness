import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

export interface OfflineData {
  id: string;
  type: 'habit' | 'journal' | 'goal' | 'routine' | 'meditation' | 'supplement';
  data: any;
  timestamp: number;
  synced: boolean;
}

export class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private readonly OFFLINE_QUEUE_KEY = 'phoenix_offline_queue';
  private readonly CACHE_PREFIX = 'phoenix_cache_';

  private constructor() {}

  private async ensureAndroidStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const perm = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      if (!perm) return true;
      const has = await PermissionsAndroid.check(perm);
      if (has) return true;
      const result = await PermissionsAndroid.request(perm);
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      if (!granted) {
        Alert.alert('Storage Permission', 'Storage permission is required for offline features.');
      }
      return granted;
    } catch (e) {
      console.log('[OfflineStorage] Permission check failed:', e);
      return true;
    }
  }

  public static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager();
    }
    return OfflineStorageManager.instance;
  }

  // Store data for offline use
  public async storeOfflineData(type: OfflineData['type'], data: any): Promise<void> {
    try {
      const offlineItem: OfflineData = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      // Get existing queue
      const queue = await this.getOfflineQueue();
      queue.push(offlineItem);

      // Store updated queue
      await this.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`[OfflineStorage] Stored ${type} data offline:`, offlineItem.id);
    } catch (error) {
      console.error('[OfflineStorage] Failed to store offline data:', error);
    }
  }

  // Get all offline data
  public async getOfflineQueue(): Promise<OfflineData[]> {
    try {
      const queueData = await this.getItem(this.OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to get offline queue:', error);
      return [];
    }
  }

  // Mark data as synced
  public async markAsSynced(id: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.map(item => 
        item.id === id ? { ...item, synced: true } : item
      );
      
      await this.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      console.log(`[OfflineStorage] Marked ${id} as synced`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to mark as synced:', error);
    }
  }

  // Remove synced data from queue
  public async clearSyncedData(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const unsyncedQueue = queue.filter(item => !item.synced);
      
      await this.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(unsyncedQueue));
      console.log(`[OfflineStorage] Cleared synced data, ${unsyncedQueue.length} items remaining`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear synced data:', error);
    }
  }

  // Cache data for quick access
  public async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttl || (24 * 60 * 60 * 1000), // Default 24 hours
      };

      await this.setItem(`${this.CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
      console.log(`[OfflineStorage] Cached data for key: ${key}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to cache data:', error);
    }
  }

  // Get cached data
  public async getCachedData(key: string): Promise<any> {
    try {
      const cacheData = await this.getItem(`${this.CACHE_PREFIX}${key}`);
      
      if (!cacheData) {
        return null;
      }

      const cacheItem = JSON.parse(cacheData);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await this.removeCachedData(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get cached data:', error);
      return null;
    }
  }

  // Remove cached data
  public async removeCachedData(key: string): Promise<void> {
    try {
      await this.removeItem(`${this.CACHE_PREFIX}${key}`);
      console.log(`[OfflineStorage] Removed cached data for key: ${key}`);
    } catch (error) {
      console.error('[OfflineStorage] Failed to remove cached data:', error);
    }
  }

  // Check if device is online
  public isOnline(): boolean {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
    // For mobile, we assume online unless explicitly set offline
    return true;
  }

  // Get pending sync count
  public async getPendingSyncCount(): Promise<number> {
    try {
      const queue = await this.getOfflineQueue();
      return queue.filter(item => !item.synced).length;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get pending sync count:', error);
      return 0;
    }
  }

  // Export all data for backup
  public async exportAllData(): Promise<string> {
    try {
      const queue = await this.getOfflineQueue();
      const allKeys = await this.getAllKeys();
      const cachedData: Record<string, any> = {};

      // Get all cached data
      for (const key of allKeys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const data = await this.getItem(key);
          if (data) {
            cachedData[key] = JSON.parse(data);
          }
        }
      }

      const exportData = {
        version: '1.0.0',
        timestamp: Date.now(),
        offlineQueue: queue,
        cachedData,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('[OfflineStorage] Failed to export data:', error);
      return '{}';
    }
  }

  // Import data from backup
  public async importData(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.offlineQueue) {
        await this.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(importData.offlineQueue));
      }

      if (importData.cachedData) {
        for (const [key, value] of Object.entries(importData.cachedData)) {
          await this.setItem(key, JSON.stringify(value));
        }
      }

      console.log('[OfflineStorage] Data imported successfully');
      return true;
    } catch (error) {
      console.error('[OfflineStorage] Failed to import data:', error);
      return false;
    }
  }

  // Clear all offline data
  public async clearAllData(): Promise<void> {
    try {
      const allKeys = await this.getAllKeys();
      const phoenixKeys = allKeys.filter(key => 
        key.startsWith('phoenix_') || key.startsWith(this.CACHE_PREFIX)
      );

      for (const key of phoenixKeys) {
        await this.removeItem(key);
      }

      console.log('[OfflineStorage] All data cleared');
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear all data:', error);
    }
  }

  // Platform-specific storage methods
  private async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('[OfflineStorage] localStorage.setItem failed, using memory fallback', e);
        memoryStore.set(key, value);
      }
    } else {
      try {
        const ok = await this.ensureAndroidStoragePermission();
        if (!ok) return;
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('[OfflineStorage] AsyncStorage.setItem failed, using memory fallback', e);
        memoryStore.set(key, value);
      }
    }
  }

  private async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        const v = localStorage.getItem(key);
        if (v == null && memoryStore.has(key)) return memoryStore.get(key) ?? null;
        return v;
      } catch (e) {
        console.warn('[OfflineStorage] localStorage.getItem failed, using memory fallback', e);
        return memoryStore.get(key) ?? null;
      }
    } else {
      try {
        const ok = await this.ensureAndroidStoragePermission();
        if (!ok) return null;
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.warn('[OfflineStorage] AsyncStorage.getItem failed, using memory fallback', e);
        return memoryStore.get(key) ?? null;
      }
    }
  }

  private async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[OfflineStorage] localStorage.removeItem failed, removing from memory fallback', e);
      } finally {
        memoryStore.delete(key);
      }
    } else {
      try {
        const ok = await this.ensureAndroidStoragePermission();
        if (!ok) return;
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn('[OfflineStorage] AsyncStorage.removeItem failed, removing from memory fallback', e);
      } finally {
        memoryStore.delete(key);
      }
    }
  }

  private async getAllKeys(): Promise<readonly string[]> {
    if (Platform.OS === 'web') {
      try {
        const keys = Object.keys(localStorage);
        const memKeys = Array.from(memoryStore.keys());
        const set = new Set<string>([...keys, ...memKeys]);
        return Array.from(set);
      } catch (e) {
        console.warn('[OfflineStorage] localStorage keys failed, using memory fallback', e);
        return Array.from(memoryStore.keys());
      }
    } else {
      try {
        const ok = await this.ensureAndroidStoragePermission();
        if (!ok) return [];
        return await AsyncStorage.getAllKeys();
      } catch (e) {
        console.warn('[OfflineStorage] AsyncStorage.getAllKeys failed, using memory fallback', e);
        return Array.from(memoryStore.keys());
      }
    }
  }
}

// Export singleton instance
export const offlineStorage = OfflineStorageManager.getInstance();

// Utility functions for easy access
export const storeOfflineData = (type: OfflineData['type'], data: any) => 
  offlineStorage.storeOfflineData(type, data);

export const getOfflineQueue = () => offlineStorage.getOfflineQueue();

export const cacheData = (key: string, data: any, ttl?: number) => 
  offlineStorage.cacheData(key, data, ttl);

export const getCachedData = (key: string) => offlineStorage.getCachedData(key);

export const isOnline = () => offlineStorage.isOnline();

export const getPendingSyncCount = () => offlineStorage.getPendingSyncCount();

export const exportAllData = () => offlineStorage.exportAllData();

export const importData = (jsonData: string) => offlineStorage.importData(jsonData);

export const clearAllOfflineData = () => offlineStorage.clearAllData();