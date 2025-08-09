// Desactivar Service Workers problemáticos
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (const registration of registrations) {
      console.log('Desregistrando SW:', registration.scope);
      registration.unregister();
    }
  });
}

// Limpiar todos los caches
if ('caches' in window) {
  caches.keys().then(function (names) {
    for (const name of names) {
      caches.delete(name);
      console.log('Cache eliminado:', name);
    }
  });
}

console.log('Service Workers y caches limpiados');
