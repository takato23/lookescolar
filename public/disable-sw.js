// Desactivar Service Workers problemáticos y limpiar cachés (dev only)
(function(){
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (const registration of registrations) {
        try { registration.unregister(); } catch (e) {}
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then(function (names) {
      for (const name of names) {
        try { caches.delete(name); } catch (e) {}
      }
    });
  }
})();
