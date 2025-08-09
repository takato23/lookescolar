// Script de emergencia para limpiar Service Workers antiguos
// Incluir esto temporalmente si necesitas limpiar SWs de otras apps

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        if (success) {
          console.log('Service Worker desregistrado:', registration.scope);
        }
      });
    }
  });
  
  // Limpiar todos los caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('Cache eliminado:', name);
      }
    });
  }
}