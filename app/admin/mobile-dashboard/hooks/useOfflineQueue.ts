import { useState, useEffect, useCallback, useRef } from 'react';

interface QueuedItem {
  id: string;
  type: 'photo' | 'order' | 'event';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
}

interface OfflineQueueState {
  queue: QueuedItem[];
  isOnline: boolean;
  pendingCount: number;
  processing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
}

interface UseOfflineQueueOptions {
  maxRetries?: number;
  syncInterval?: number; // in milliseconds
  autoSync?: boolean;
}

export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const {
    maxRetries = 3,
    syncInterval = 30000, // 30 seconds
    autoSync = true,
  } = options;

  const [state, setState] = useState<OfflineQueueState>({
    queue: [],
    isOnline: navigator.onLine,
    pendingCount: 0,
    processing: false,
    lastSyncTime: null,
    syncError: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline-queue');
    if (savedQueue) {
      try {
        const queue = JSON.parse(savedQueue);
        setState(prev => ({
          ...prev,
          queue,
          pendingCount: queue.filter((item: QueuedItem) => item.retryCount < item.maxRetries).length,
        }));
      } catch (error) {
        console.error('Error loading offline queue:', error);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('offline-queue', JSON.stringify(state.queue));
  }, [state.queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      if (autoSync && state.queue.length > 0) {
        processQueue();
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, state.queue.length]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSync && state.isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (state.queue.length > 0 && !processingRef.current) {
          processQueue();
        }
      }, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, state.isOnline, state.queue.length, syncInterval]);

  const addToQueue = useCallback((
    type: QueuedItem['type'],
    data: any,
    priority: QueuedItem['priority'] = 'normal'
  ) => {
    const item: QueuedItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      priority,
    };

    setState(prev => {
      const newQueue = [...prev.queue, item];
      // Sort by priority (high -> normal -> low) and then by timestamp
      newQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      return {
        ...prev,
        queue: newQueue,
        pendingCount: newQueue.filter(item => item.retryCount < item.maxRetries).length,
      };
    });

    return item.id;
  }, [maxRetries]);

  const removeFromQueue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(item => item.id !== id),
      pendingCount: prev.queue.filter(item => item.id !== id && item.retryCount < item.maxRetries).length,
    }));
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [],
      pendingCount: 0,
    }));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !state.isOnline || state.queue.length === 0) {
      return;
    }

    processingRef.current = true;
    setState(prev => ({ ...prev, processing: true, syncError: null }));

    const itemsToProcess = state.queue.filter(item => item.retryCount < item.maxRetries);

    for (const item of itemsToProcess) {
      try {
        await syncItem(item);

        // Remove successful items from queue
        setState(prev => ({
          ...prev,
          queue: prev.queue.filter(q => q.id !== item.id),
          lastSyncTime: Date.now(),
        }));

      } catch (error) {
        // Increment retry count for failed items
        setState(prev => ({
          ...prev,
          queue: prev.queue.map(q =>
            q.id === item.id
              ? { ...q, retryCount: q.retryCount + 1 }
              : q
          ),
        }));
      }
    }

    setState(prev => ({
      ...prev,
      processing: false,
      pendingCount: prev.queue.filter(item => item.retryCount < item.maxRetries).length,
    }));

    processingRef.current = false;
  }, [state.isOnline, state.queue]);

  const syncItem = async (item: QueuedItem): Promise<void> => {
    // TODO: Replace with actual API calls based on item type
    switch (item.type) {
      case 'photo':
        await syncPhoto(item.data);
        break;
      case 'order':
        await syncOrder(item.data);
        break;
      case 'event':
        await syncEvent(item.data);
        break;
      default:
        throw new Error(`Unknown item type: ${item.type}`);
    }
  };

  const syncPhoto = async (photoData: any): Promise<void> => {
    // Simulate API call
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve(true);
        } else {
          reject(new Error('Photo upload failed'));
        }
      }, 1000 + Math.random() * 1000);
    });
  };

  const syncOrder = async (orderData: any): Promise<void> => {
    // Simulate API call
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.05) { // 95% success rate
          resolve(true);
        } else {
          reject(new Error('Order sync failed'));
        }
      }, 500 + Math.random() * 500);
    });
  };

  const syncEvent = async (eventData: any): Promise<void> => {
    // Simulate API call
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          resolve(true);
        } else {
          reject(new Error('Event sync failed'));
        }
      }, 800 + Math.random() * 800);
    });
  };

  const retryItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.map(item =>
        item.id === id
          ? { ...item, retryCount: 0 }
          : item
      ),
    }));

    if (state.isOnline) {
      processQueue();
    }
  }, [state.isOnline, processQueue]);

  const getQueueStats = useCallback(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentItems = state.queue.filter(item => item.timestamp > oneHourAgo);
    const oldItems = state.queue.filter(item => item.timestamp < oneDayAgo);
    const failedItems = state.queue.filter(item => item.retryCount >= item.maxRetries);

    return {
      total: state.queue.length,
      recent: recentItems.length,
      old: oldItems.length,
      failed: failedItems.length,
      byType: state.queue.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [state.queue]);

  const forceSync = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  return {
    // State
    ...state,

    // Actions
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryItem,
    processQueue,
    forceSync,

    // Utils
    getQueueStats,
  };
}
