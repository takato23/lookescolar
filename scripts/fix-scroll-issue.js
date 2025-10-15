// Script temporal para diagnosticar y arreglar el problema de scroll
// Ejecutar en consola del navegador: copy and paste this code

(function() {
  console.log('🔍 Diagnosticando problema de scroll...');

  // 1. Verificar si hay modales abiertos
  const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]');
  console.log('Modales abiertos:', modals.length);
  modals.forEach((modal, index) => {
    console.log(`Modal ${index + 1}:`, modal);
  });

  // 2. Verificar clases del body
  const bodyClasses = document.body.className;
  console.log('Clases del body:', bodyClasses);

  // 3. Verificar si hay modal-open
  const hasModalOpen = document.body.classList.contains('modal-open');
  console.log('Tiene clase modal-open:', hasModalOpen);

  // 4. Verificar estilos del body
  const bodyStyles = window.getComputedStyle(document.body);
  console.log('Overflow del body:', bodyStyles.overflow);
  console.log('Position del body:', bodyStyles.position);

  // 5. Arreglar si es necesario
  if (hasModalOpen || bodyStyles.overflow === 'hidden') {
    console.log('🔧 Arreglando scroll...');

    // Remover clase modal-open
    document.body.classList.remove('modal-open');

    // Restaurar scroll normal
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.left = '';

    console.log('✅ Scroll restaurado');
  } else {
    console.log('✅ Scroll parece estar bien');
  }

  // 6. Verificar eventos de wheel
  const wheelHandler = (e) => {
    console.log('Wheel event:', e);
  };

  // Agregar temporalmente listener para diagnosticar
  document.addEventListener('wheel', wheelHandler, { passive: true, once: true });
  console.log('🎯 Prueba scrolling con la rueda del mouse ahora');

  // Remover listener después de 3 segundos
  setTimeout(() => {
    document.removeEventListener('wheel', wheelHandler);
    console.log('Listener removido');
  }, 3000);

  console.log('📋 Instrucciones:');
  console.log('1. Prueba hacer scroll con la rueda del mouse');
  console.log('2. Si no funciona, recarga la página (Ctrl+Shift+R)');
  console.log('3. Si persiste, podría ser un problema del navegador');
})();
