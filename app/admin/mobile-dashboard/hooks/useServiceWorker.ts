import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface UseServiceWorkerOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function useServiceWorker(options: UseServiceWorkerOptions = {}) {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    updateAvailable: false,
    registration: null,
    error: null,
  });

  const register = useCallback(async (scriptURL: string = '/sw-mobile-dashboard.js') => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Service Workers are not supported in this browser',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }));

      const registration = await navigator.serviceWorker.register(scriptURL);

      setState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        registration,
      }));

      console.log('[SW] Service Worker registered successfully:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, updateAvailable: true }));
              options.onUpdate?.(registration);
            }
          });
        }
      });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register service worker';
      setState(prev => ({
        ...prev,
        isInstalling: false,
        error: errorMessage,
      }));
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [state.isSupported, options]);

  const update = useCallback(async () => {
    const registration = state.registration;
    if (!registration || !state.updateAvailable) return;

    try {
      const waitingWorker = registration.waiting;

      if (waitingWorker) {
        // Send message to skip waiting
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        setState(prev => ({ ...prev, updateAvailable: false }));
      }
    } catch (error) {
      console.error('[SW] Error updating service worker:', error);
    }
  }, [state.registration, state.updateAvailable]);

  const unregister = useCallback(async () => {
    const registration = state.registration;
    if (!registration) return;

    try {
      await registration.unregister();
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registration: null,
        updateAvailable: false,
      }));
    } catch (error) {
      console.error('[SW] Error unregistering service worker:', error);
    }
  }, [state.registration]);

  const sendMessage = useCallback((message: any) => {
    const activeWorker = state.registration?.active;
    if (!activeWorker) return;

    activeWorker.postMessage(message);
  }, [state.registration]);

  const getCacheInfo = useCallback(async (): Promise<any> => {
    const activeWorker = state.registration?.active;
    if (!activeWorker) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      activeWorker.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      );
    });
  }, [state.registration]);

  const clearCache = useCallback(async (cacheName?: string): Promise<boolean> => {
    const activeWorker = state.registration?.active;
    if (!activeWorker) return false;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.success || false);
      };

      activeWorker.postMessage(
        {
          type: 'CLEAR_CACHE',
          payload: { cacheName: cacheName || 'dynamic-v1' },
        },
        [messageChannel.port2]
      );
    });
  }, [state.registration]);

  // Auto-register on mount
  useEffect(() => {
    if (state.isSupported && !state.isRegistered && !state.isInstalling) {
      register();
    }
  }, [state.isSupported, state.isRegistered, state.isInstalling, register]);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from service worker if needed
      console.log('[SW] Message from service worker:', event.data);
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    ...state,
    register,
    update,
    unregister,
    sendMessage,
    getCacheInfo,
    clearCache,
  };
}
