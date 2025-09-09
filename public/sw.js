const CACHE_NAME = 'lookescolar-v1';
const OFFLINE_URL = '/offline.html';

// Recursos críticos para cachear
const CRITICAL_RESOURCES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// URLs que siempre deben ser de red (nunca cacheadas)
const NETWORK_ONLY = [
  '/api/',
  '/auth/',
  '/_next/webpack-hmr',
];

// URLs que se pueden cachear temporalmente
const CACHE_FIRST = [
  '/_next/static/',
  '/images/',
  '/fonts/',
];

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        // Activar inmediatamente sin esperar
        return self.skipWaiting();
      })
  );
});

// Activar service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Controlar todas las páginas inmediatamente
        return self.clients.claim();
      })
  );
});

// Interceptar fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests que no son GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar requests de chrome-extension
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Network only para APIs y auth
  if (NETWORK_ONLY.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(
      fetch(request).catch(() => {
        // Si falla la red, mostrar página offline para navegación
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        throw new Error('Network request failed');
      })
    );
    return;
  }
  
  // Cache first para recursos estáticos
  if (CACHE_FIRST.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar cache en background
            fetch(request)
              .then(response => {
                if (response.status === 200) {
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, response.clone()));
                }
              })
              .catch(() => {
                // Ignorar errores de background update
              });
            
            return cachedResponse;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, response.clone()));
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Network first con fallback a cache para páginas
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cachear páginas exitosas
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Buscar en cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Mostrar página offline
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Para todo lo demás, network first con cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Solo cachear respuestas exitosas
        if (response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync para cuando se recupera la conexión
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aquí podrías implementar sincronización de datos offline
      Promise.resolve()
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  // Always respond to messages to prevent channel closure errors
  if (event.ports && event.ports[0]) {
    try {
      event.ports[0].postMessage({
        success: true,
        message: 'Service worker received message',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[SW] Error responding to message:', error);
    }
  }
});

// Push notifications (opcional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'Nuevas fotos disponibles en tu galería',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver fotos'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('LookEscolar', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || '/')
    );
  }
});