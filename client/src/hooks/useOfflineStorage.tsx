import { useState, useEffect, useCallback } from 'react';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

interface UseOfflineStorageOptions {
  maxAge?: number; // in milliseconds
  maxItems?: number;
}

export const useOfflineStorage = (options: UseOfflineStorageOptions = {}) => {
  const { maxAge = 24 * 60 * 60 * 1000, maxItems = 100 } = options; // Default 24 hours
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store data with expiration
  const setItem = useCallback((key: string, data: any, customMaxAge?: number) => {
    try {
      const expiresAt = Date.now() + (customMaxAge || maxAge);
      const item: OfflineData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt
      };

      localStorage.setItem(`offline_${key}`, JSON.stringify(item));
      
      // Clean up old items
      cleanup();
      
      return true;
    } catch (error) {
      console.error('Error storing offline data:', error);
      return false;
    }
  }, [maxAge]);

  // Get data with expiration check
  const getItem = useCallback((key: string) => {
    try {
      const itemStr = localStorage.getItem(`offline_${key}`);
      if (!itemStr) return null;

      const item: OfflineData = JSON.parse(itemStr);
      
      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        localStorage.removeItem(`offline_${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Error retrieving offline data:', error);
      return null;
    }
  }, []);

  // Remove item
  const removeItem = useCallback((key: string) => {
    try {
      localStorage.removeItem(`offline_${key}`);
      return true;
    } catch (error) {
      console.error('Error removing offline data:', error);
      return false;
    }
  }, []);

  // Clear all offline data
  const clear = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('offline_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }, []);

  // Clean up expired and excess items
  const cleanup = useCallback(() => {
    try {
      const items: OfflineData[] = [];
      const keys = Object.keys(localStorage);
      
      // Collect all offline items
      keys.forEach(key => {
        if (key.startsWith('offline_')) {
          try {
            const item: OfflineData = JSON.parse(localStorage.getItem(key)!);
            items.push({ ...item, key: key.replace('offline_', '') });
          } catch (error) {
            // Remove corrupted items
            localStorage.removeItem(key);
          }
        }
      });

      // Remove expired items
      const now = Date.now();
      items.forEach(item => {
        if (item.expiresAt && now > item.expiresAt) {
          localStorage.removeItem(`offline_${item.key}`);
        }
      });

      // Remove excess items (keep most recent)
      const validItems = items.filter(item => 
        !item.expiresAt || now <= item.expiresAt
      );

      if (validItems.length > maxItems) {
        const sortedItems = validItems.sort((a, b) => b.timestamp - a.timestamp);
        const itemsToRemove = sortedItems.slice(maxItems);
        
        itemsToRemove.forEach(item => {
          localStorage.removeItem(`offline_${item.key}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning up offline data:', error);
    }
  }, [maxItems]);

  // Get all stored keys
  const getKeys = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith('offline_'))
        .map(key => key.replace('offline_', ''));
    } catch (error) {
      console.error('Error getting offline keys:', error);
      return [];
    }
  }, []);

  // Get storage usage info
  const getStorageInfo = useCallback(() => {
    try {
      const keys = getKeys();
      const totalSize = keys.reduce((size, key) => {
        const itemStr = localStorage.getItem(`offline_${key}`);
        return size + (itemStr ? itemStr.length : 0);
      }, 0);

      return {
        itemCount: keys.length,
        totalSize,
        maxItems,
        isOnline
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { itemCount: 0, totalSize: 0, maxItems, isOnline };
    }
  }, [getKeys, maxItems, isOnline]);

  // Auto-cleanup on mount
  useEffect(() => {
    cleanup();
  }, [cleanup]);

  return {
    isOnline,
    setItem,
    getItem,
    removeItem,
    clear,
    cleanup,
    getKeys,
    getStorageInfo
  };
}; 
