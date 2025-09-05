/**
 * Safe service worker communication utilities
 * Prevents message channel closure errors
 */

interface ServiceWorkerMessage {
  type: string;
  data?: any;
  id?: string;
}

interface ServiceWorkerResponse {
  success: boolean;
  data?: any;
  error?: string;
  id?: string;
}

class ServiceWorkerCommunicator {
  private messageId = 0;
  private pendingMessages = new Map<string, {
    resolve: (value: ServiceWorkerResponse) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor() {
    // Listen for messages from service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  private handleMessage(event: MessageEvent) {
    const response = event.data as ServiceWorkerResponse;
    if (response.id && this.pendingMessages.has(response.id)) {
      const pending = this.pendingMessages.get(response.id)!;
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(response.id);
      
      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response.error || 'Service worker error'));
      }
    }
  }

  async sendMessage(message: ServiceWorkerMessage, timeout = 5000): Promise<ServiceWorkerResponse> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        reject(new Error('Service worker not supported'));
        return;
      }

      const id = `msg_${++this.messageId}_${Date.now()}`;
      const messageWithId = { ...message, id };

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error('Service worker communication timeout'));
      }, timeout);

      // Store pending message
      this.pendingMessages.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Send message to service worker
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage(messageWithId);
        } else {
          clearTimeout(timeoutHandle);
          this.pendingMessages.delete(id);
          reject(new Error('Service worker not active'));
        }
      }).catch(error => {
        clearTimeout(timeoutHandle);
        this.pendingMessages.delete(id);
        reject(error);
      });
    });
  }

  // Safe method to check if service worker is available
  async isServiceWorkerReady(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return false;
      }
      
      const registration = await navigator.serviceWorker.ready;
      return !!registration.active;
    } catch {
      return false;
    }
  }

  // Clean up pending messages
  cleanup() {
    this.pendingMessages.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingMessages.clear();
  }
}

// Singleton instance
export const serviceWorkerCommunicator = new ServiceWorkerCommunicator();

// Utility functions
export async function safeServiceWorkerMessage(
  type: string, 
  data?: any, 
  timeout = 5000
): Promise<ServiceWorkerResponse | null> {
  try {
    const isReady = await serviceWorkerCommunicator.isServiceWorkerReady();
    if (!isReady) {
      console.warn('Service worker not ready, skipping message');
      return null;
    }

    return await serviceWorkerCommunicator.sendMessage({ type, data }, timeout);
  } catch (error) {
    console.warn('Service worker communication failed:', error);
    return null;
  }
}

// Error boundary for service worker operations
export function withServiceWorkerErrorHandling<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T | null> {
  return operation().catch(error => {
    console.warn('Service worker operation failed:', error);
    return fallback ? fallback() : null;
  });
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    serviceWorkerCommunicator.cleanup();
  });
}
