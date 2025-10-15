// Service Worker para el Dashboard Móvil de Fotógrafos
// Proporciona funcionalidad offline y caching para mejorar la experiencia

const CACHE_NAME = 'mobile-dashboard-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Recursos estáticos que se cachean inmediatamente
const STATIC_ASSETS = [
  '/admin/mobile-dashboard',
  '/admin/mobile-dashboard/',
  '/_next/static/',
  // Add more static assets as needed
];

// Recursos dinámicos que se cachean bajo demanda
const API_ENDPOINTS = [
  '/api/admin/events',
  '/api/admin/orders',
  '/api/admin/photos',
];

// Instalar el service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing mobile dashboard service worker');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activar el service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating mobile dashboard service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estrategia para recursos estáticos
  if (STATIC_ASSETS.some(asset => url.pathname.startsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              // Cache the response for future use
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
              return response;
            })
            .catch(() => {
              // Return offline fallback if available
              return caches.match('/offline.html');
            });
        })
    );
  }

  // Estrategia para API endpoints (Network First con fallback a cache)
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la respuesta es válida, actualizar el cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback al cache si no hay conexión
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a custom offline response
              return new Response(
                JSON.stringify({
                  error: 'Offline',
                  message: 'Esta funcionalidad requiere conexión a internet',
                  timestamp: Date.now(),
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );
            });
        })
    );
  }

  // Estrategia por defecto para otros recursos
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_API_RESPONSE':
      // Manually cache an API response
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          cache.put(payload.request, payload.response);
        });
      break;

    case 'CLEAR_CACHE':
      // Clear specific cache
      caches.delete(payload.cacheName)
        .then(() => {
          event.ports[0].postMessage({ success: true });
        });
      break;

    case 'GET_CACHE_INFO':
      // Return cache information
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              return caches.open(cacheName)
                .then((cache) => {
                  return cache.keys()
                    .then((keys) => ({
                      name: cacheName,
                      size: keys.length,
                    }));
                });
            })
          );
        })
        .then((cacheInfo) => {
          event.ports[0].postMessage({ cacheInfo });
        });
      break;
  }
});

// Background sync para uploads cuando vuelve la conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Process queued uploads
      processQueuedUploads()
    );
  }
});

function processQueuedUploads() {
  // Get queued uploads from IndexedDB or localStorage
  getQueuedUploads().then((queuedUploads) => {
    queuedUploads.forEach((upload) => {
      fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(upload),
      })
      .then((response) => {
        if (response.ok) {
          // Remove from queue on success
          removeQueuedUpload(upload.id);
          console.log('[SW] Upload processed successfully:', upload.id);
        }
      })
      .catch((error) => {
        console.error('[SW] Failed to process upload:', upload.id, error);
      });
    });
  })
  .catch((error) => {
    console.error('[SW] Error processing queued uploads:', error);
  });
}

// Helper functions for IndexedDB operations
function getQueuedUploads() {
  return new Promise((resolve) => {
    // This would typically use IndexedDB
    // For now, return empty array as placeholder
    resolve([]);
  });
}

function removeQueuedUpload(id) {
  return new Promise((resolve) => {
    // This would typically remove from IndexedDB
    resolve();
  });
}

// Push notifications para eventos importantes
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/admin/mobile-dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
      },
      {
        action: 'dismiss',
        title: 'Descartar',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      // Sync content in background
      syncContent()
    );
  }
});

function syncContent() {
  // Sync events, orders, and other data
  const endpoints = ['/api/admin/events', '/api/admin/orders'];

  endpoints.forEach((endpoint) => {
    fetch(endpoint)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok');
      })
      .then((data) => {
        // Update cache with fresh data
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(endpoint, new Response(JSON.stringify(data)));
          });
      })
      .catch((error) => {
        console.error('[SW] Failed to sync endpoint:', endpoint, error);
      });
  });
}
