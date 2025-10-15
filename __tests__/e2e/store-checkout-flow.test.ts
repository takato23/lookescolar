import { test, expect } from '@playwright/test';

test.describe('Store Checkout Flow', () => {
  test('debe completar flujo completo de compra', async ({ page }) => {
    // 1. Navegar a tienda
    await page.goto('/store-unified/test-token');

    // 2. Verificar carga de galería
    await expect(page.locator('[aria-label*="foto"]')).toBeVisible();

    // 3. Seleccionar primera foto
    await page.keyboard.press('Tab'); // Enfocar primera foto
    await page.keyboard.press('Enter'); // Seleccionar foto

    // 4. Seleccionar paquete
    await expect(page.locator('text=Opción A')).toBeVisible();
    await page.click('[aria-label*="Seleccionar paquete Opción A"]');

    // 5. Seleccionar fotos para el paquete
    await page.click('[data-testid="photo-selector"] input[type="checkbox"]').first();
    await page.click('button:has-text("Agregar al Carrito")');

    // 6. Verificar carrito
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('$2,000');

    // 7. Proceder al checkout
    await page.click('button:has-text("Proceder al Checkout")');

    // 8. Verificar métodos de pago
    await expect(page.locator('text=MercadoPago')).toBeVisible();
    await expect(page.locator('text=Efectivo')).toBeVisible();

    // 9. Completar compra con WhatsApp
    await page.click('button:has-text("WhatsApp")');

    // 10. Verificar que se abre WhatsApp con mensaje correcto
    const whatsappPopup = page.waitForEvent('popup');
    const popup = await whatsappPopup;
    await expect(popup.url()).toContain('wa.me');
  });

  test('debe manejar errores de inventario', async ({ page }) => {
    // Mock API para simular producto agotado
    await page.route('**/api/inventory/check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          productId: 'opcionA',
          available: false,
          stock: 0,
          reserved: 0,
          maxQuantity: 0
        })
      });
    });

    await page.goto('/store-unified/test-token');

    // Completar flujo hasta checkout
    await expect(page.locator('[aria-label*="foto"]')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.click('[aria-label*="Seleccionar paquete Opción A"]');
    await page.click('[data-testid="photo-selector"] input[type="checkbox"]').first();
    await page.click('button:has-text("Agregar al Carrito")');
    await page.click('button:has-text("Proceder al Checkout")');

    // Verificar mensaje de error
    await expect(page.locator('text=*no están disponibles*')).toBeVisible();
  });

  test('debe manejar errores de carga de tienda', async ({ page }) => {
    // Mock API para simular error de carga
    await page.route('**/api/store/test-token**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/store-unified/test-token');

    // Verificar que se muestra el error boundary
    await expect(page.locator('text=Error en la tienda')).toBeVisible();
    await expect(page.locator('button:has-text("Reintentar")')).toBeVisible();
  });

  test('debe permitir navegación por teclado completa', async ({ page }) => {
    await page.goto('/store-unified/test-token');

    // 1. Navegar a primera foto con Tab
    await page.keyboard.press('Tab');
    await expect(page.locator('[aria-label*="foto"]').first()).toBeFocused();

    // 2. Seleccionar foto con Enter
    await page.keyboard.press('Enter');

    // 3. Seleccionar paquete con Tab y Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[aria-label*="Seleccionar paquete"]').first()).toBeFocused();
    await page.keyboard.press('Enter');

    // 4. Seleccionar foto en selector con Tab y Space
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press(' '); // Space para seleccionar checkbox

    // 5. Agregar al carrito con Tab y Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // 6. Checkout con Ctrl+Enter
    await page.keyboard.press('Control+Enter');

    // Verificar que llegó al checkout
    await expect(page.locator('text=Checkout')).toBeVisible();
  });

  test('debe manejar accesibilidad correctamente', async ({ page }) => {
    await page.goto('/store-unified/test-token');

    // Verificar que todos los elementos interactivos tienen ARIA labels
    const interactiveElements = await page.locator('[role="button"], button, [tabindex="0"]').all();

    for (const element of interactiveElements) {
      const hasAriaLabel = await element.getAttribute('aria-label');
      const hasText = await element.textContent();

      // Debe tener aria-label o texto accesible
      expect(hasAriaLabel || hasText?.trim()).toBeTruthy();
    }

    // Verificar navegación por teclado
    await page.keyboard.press('Tab');
    const firstFocusable = await page.locator(':focus').first();
    expect(firstFocusable).toBeTruthy();

    // Verificar que se puede navegar con flechas
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
  });

  test('debe manejar carga lazy de imágenes', async ({ page }) => {
    await page.goto('/store-unified/test-token');

    // Verificar que las imágenes tienen loading="lazy"
    const images = await page.locator('img[loading="lazy"]').all();
    expect(images.length).toBeGreaterThan(0);

    // Verificar que las imágenes se cargan cuando entran en viewport
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Esperar a que se carguen más imágenes
    await page.waitForTimeout(1000);
    const visibleImages = await page.locator('img:not([loading="lazy"])').all();
    expect(visibleImages.length).toBeGreaterThan(0);
  });

  test('debe manejar sanitización de contenido', async ({ page }) => {
    // Mock API con contenido XSS
    await page.route('**/api/store/test-token**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          store: {
            name: '<script>alert("xss")</script>Tienda Segura',
            settings: {}
          },
          assets: []
        })
      });
    });

    await page.goto('/store-unified/test-token');

    // Verificar que el script no se ejecuta
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("xss")</script>');
    expect(pageContent).toContain('Tienda Segura');
  });
});
