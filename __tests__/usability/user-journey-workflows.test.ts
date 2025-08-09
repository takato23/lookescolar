/**
 * @fileoverview User Journey and Workflow Testing
 * End-to-end usability testing for photographer and client workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Photographer Workflow Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Setup admin session
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');
  });

  test('Complete event creation workflow', async ({ page }) => {
    // Navigate to create event
    await page.click('[data-testid="create-event-button"]');
    await expect(page).toHaveURL('/admin/events/new');

    // Fill event form
    await page.fill('[data-testid="event-name"]', 'Graduación 2024 - 5to Grado');
    await page.fill('[data-testid="event-description"]', 'Ceremonia de graduación');
    await page.selectOption('[data-testid="event-school"]', 'Escuela San José');
    await page.fill('[data-testid="event-date"]', '2024-12-15');

    // Configure pricing
    await page.fill('[data-testid="photo-price"]', '150');
    await page.fill('[data-testid="package-price"]', '500');

    // Submit form
    await page.click('[data-testid="create-event-submit"]');
    
    // Verify event created
    await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+/);
    await expect(page.locator('[data-testid="event-title"]')).toContainText('Graduación 2024');

    // Success notification should appear
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Evento creado exitosamente');
  });

  test('Student list generation and QR workflow', async ({ page }) => {
    await page.goto('/admin/events/test-event-123');

    // Generate student list
    await page.click('[data-testid="generate-subjects-button"]');
    
    // Add students manually
    await page.click('[data-testid="add-student-button"]');
    await page.fill('[data-testid="student-name"]', 'Ana García López');
    await page.fill('[data-testid="student-grade"]', '5A');
    await page.click('[data-testid="save-student"]');

    // Bulk import from CSV
    await page.click('[data-testid="bulk-import-button"]');
    await page.setInputFiles('[data-testid="csv-upload"]', '__tests__/fixtures/students.csv');
    await page.click('[data-testid="import-submit"]');

    // Verify students imported
    await expect(page.locator('[data-testid="student-count"]')).toContainText('25 estudiantes');

    // Generate QR codes
    await page.click('[data-testid="generate-qr-button"]');
    
    // Wait for QR generation
    await expect(page.locator('[data-testid="qr-generation-progress"]')).toBeVisible();
    await page.waitForSelector('[data-testid="qr-download-ready"]', { timeout: 10000 });

    // Download QR PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-qr-pdf"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/graduacion-2024.*\.pdf$/);
  });

  test('Bulk photo upload with progress tracking', async ({ page }) => {
    await page.goto('/admin/photos');

    // Test drag and drop functionality
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-dropzone"]');
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles([
      '__tests__/fixtures/photo1.jpg',
      '__tests__/fixtures/photo2.jpg',
      '__tests__/fixtures/photo3.jpg',
      '__tests__/fixtures/photo4.jpg',
      '__tests__/fixtures/photo5.jpg',
    ]);

    // Verify upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-count"]')).toContainText('5 fotos');

    // Wait for processing completion
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });

    // Verify watermarks applied
    const processedPhotos = page.locator('[data-testid="photo-card"][data-status="processed"]');
    expect(await processedPhotos.count()).toBe(5);

    // Check success notification
    await expect(page.locator('[data-testid="upload-success"]')).toContainText('5 fotos procesadas exitosamente');
  });

  test('Photo tagging workflow with keyboard shortcuts', async ({ page }) => {
    await page.goto('/admin/tagging');

    // Select first untagged photo
    const firstPhoto = page.locator('[data-testid="untagged-photo"]').first();
    await firstPhoto.click();

    // Test QR scanner simulation
    await page.click('[data-testid="scan-qr-button"]');
    
    // Mock QR scan result
    await page.evaluate(() => {
      window.postMessage({ 
        type: 'QR_SCANNED', 
        data: { studentId: 'student-123', name: 'Ana García López' }
      }, '*');
    });

    // Verify student selected
    await expect(page.locator('[data-testid="selected-student"]')).toContainText('Ana García López');

    // Tag photo to student
    await page.keyboard.press('Enter'); // Keyboard shortcut
    
    // Verify tagging
    await expect(page.locator('[data-testid="tagging-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="tagged-count"]')).toContainText('1 foto etiquetada');

    // Test bulk tagging
    await page.keyboard.press('Meta+a'); // Select all visible photos
    await page.keyboard.press('t'); // Bulk tag shortcut
    
    // Should open bulk tag modal
    await expect(page.locator('[data-testid="bulk-tag-modal"]')).toBeVisible();
    
    // Select student for bulk tagging
    await page.click('[data-testid="student-select"]');
    await page.click('[text="María Rodríguez"]');
    await page.click('[data-testid="bulk-tag-confirm"]');

    // Verify bulk tagging success
    await expect(page.locator('[data-testid="bulk-success"]')).toContainText('fotos etiquetadas');
  });

  test('Command palette workflow efficiency', async ({ page }) => {
    await page.goto('/admin');

    // Open command palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Quick navigation to photos
    await page.keyboard.type('fotos');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/admin/photos');

    // Quick upload via command
    await page.keyboard.press('Meta+k');
    await page.keyboard.type('subir');
    await page.keyboard.press('Enter');
    
    // Should trigger upload dialog
    await expect(page.locator('[data-testid="file-picker"]')).toBeVisible();

    // Quick event creation
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+k');
    await page.keyboard.type('crear evento');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/admin/events/new');
  });

  test('Order management workflow', async ({ page }) => {
    await page.goto('/admin/orders');

    // Filter orders by status
    await page.selectOption('[data-testid="order-status-filter"]', 'pending');
    
    // Verify filtering works
    const pendingOrders = page.locator('[data-testid="order-row"][data-status="pending"]');
    expect(await pendingOrders.count()).toBeGreaterThan(0);

    // View order details
    await pendingOrders.first().click();
    await expect(page.locator('[data-testid="order-modal"]')).toBeVisible();

    // Mark as delivered
    await page.click('[data-testid="mark-delivered"]');
    await page.fill('[data-testid="delivery-notes"]', 'Entregado en persona el 15/12');
    await page.click('[data-testid="confirm-delivery"]');

    // Verify status update
    await expect(page.locator('[data-testid="order-status"]')).toContainText('Entregado');

    // Export orders to CSV
    await page.click('[data-testid="export-orders"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-csv"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/pedidos.*\.csv$/);
  });
});

test.describe('Client Workflow Testing', () => {
  test('Family portal access via token', async ({ page }) => {
    // Direct access with token
    await page.goto('/f/family-token-12345');

    // Verify family portal loads
    await expect(page.locator('[data-testid="family-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-info"]')).toContainText('Graduación 2024');

    // Check token validation
    await expect(page.locator('[data-testid="token-status"]')).toContainText('Válido hasta');
    
    // Verify only family photos shown
    const photoCards = page.locator('[data-testid="family-photo"]');
    expect(await photoCards.count()).toBeGreaterThan(0);

    // Photos should have family member's name
    await expect(photoCards.first()).toContainText('Ana García López');
  });

  test('Photo selection and cart workflow', async ({ page }) => {
    await page.goto('/f/family-token-12345');

    // Select individual photos
    const firstPhoto = page.locator('[data-testid="family-photo"]').first();
    await firstPhoto.click();
    
    // Verify photo selected
    await expect(firstPhoto).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');

    // Select multiple photos
    await page.keyboard.down('Meta');
    await page.locator('[data-testid="family-photo"]').nth(1).click();
    await page.locator('[data-testid="family-photo"]').nth(2).click();
    await page.keyboard.up('Meta');

    // Verify multiple selection
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('3');

    // View photo in modal
    await firstPhoto.dblclick();
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    
    // Should show selection state in modal
    await expect(page.locator('[data-testid="modal-selected"]')).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');

    // View cart
    await page.click('[data-testid="view-cart"]');
    await expect(page.locator('[data-testid="cart-items"]')).toBeVisible();
    
    // Verify cart contents
    const cartItems = page.locator('[data-testid="cart-item"]');
    expect(await cartItems.count()).toBe(3);

    // Remove item from cart
    await cartItems.first().locator('[data-testid="remove-item"]').click();
    expect(await cartItems.count()).toBe(2);
  });

  test('Checkout and payment workflow', async ({ page }) => {
    await page.goto('/f/family-token-12345/checkout');

    // Verify cart summary
    await expect(page.locator('[data-testid="cart-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$450');

    // Fill contact information
    await page.fill('[data-testid="contact-name"]', 'María García');
    await page.fill('[data-testid="contact-email"]', 'maria.garcia@email.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    
    // Add delivery notes
    await page.fill('[data-testid="delivery-notes"]', 'Por favor contactar antes de entregar');

    // Verify form validation
    await page.fill('[data-testid="contact-email"]', 'invalid-email');
    await page.click('[data-testid="proceed-payment"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toContainText('email válido');

    // Correct email and proceed
    await page.fill('[data-testid="contact-email"]', 'maria.garcia@email.com');
    await page.click('[data-testid="proceed-payment"]');

    // Should redirect to Mercado Pago
    await page.waitForURL(/mercadopago\.com/, { timeout: 10000 });
    
    // Verify MP checkout loads
    await expect(page.locator('[data-testid="mp-checkout"]')).toBeVisible();
  });

  test('Order status tracking', async ({ page }) => {
    await page.goto('/f/family-token-12345');

    // Check if order exists
    const orderStatus = page.locator('[data-testid="order-status"]');
    
    if (await orderStatus.isVisible()) {
      // View order details
      await orderStatus.click();
      
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-status"]')).toBeVisible();
      
      // Verify order information
      await expect(page.locator('[data-testid="order-photos"]')).toBeVisible();
      await expect(page.locator('[data-testid="delivery-info"]')).toBeVisible();
      
      // Check payment proof if available
      const paymentProof = page.locator('[data-testid="payment-proof"]');
      if (await paymentProof.isVisible()) {
        await expect(paymentProof).toContainText('MP-');
      }
    }
  });
});

test.describe('Public Gallery Workflow Testing', () => {
  test('Public gallery access and navigation', async ({ page }) => {
    await page.goto('/gallery/public-event-123');

    // Verify public gallery loads
    await expect(page.locator('[data-testid="public-gallery"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-title"]')).toContainText('Evento Público');

    // Photos should be watermarked
    const photoCards = page.locator('[data-testid="public-photo"]');
    expect(await photoCards.count()).toBeGreaterThan(0);

    // Click photo to view modal
    await photoCards.first().click();
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    
    // Should show watermark notice
    await expect(page.locator('[data-testid="watermark-notice"]')).toBeVisible();

    // Navigate between photos
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="photo-counter"]')).toContainText('2 de');
  });

  test('Contact form workflow', async ({ page }) => {
    await page.goto('/gallery/public-event-123');

    // Scroll to contact form
    await page.locator('[data-testid="contact-form"]').scrollIntoViewIfNeeded();

    // Fill contact form
    await page.fill('[data-testid="contact-name"]', 'Juan Pérez');
    await page.fill('[data-testid="contact-email"]', 'juan.perez@email.com');
    await page.fill('[data-testid="contact-phone"]', '+1234567890');
    await page.fill('[data-testid="contact-message"]', 'Estoy interesado en comprar fotos de mi hijo');

    // Submit form
    await page.click('[data-testid="submit-contact"]');

    // Verify success
    await expect(page.locator('[data-testid="contact-success"]')).toContainText('Mensaje enviado exitosamente');
    
    // Form should reset
    await expect(page.locator('[data-testid="contact-name"]')).toHaveValue('');
  });
});

test.describe('Error Recovery Workflows', () => {
  test('Network interruption recovery', async ({ page }) => {
    await page.goto('/f/family-token-12345');

    // Simulate network failure during photo loading
    await page.setOfflineMode(true);
    
    // Try to navigate
    await page.click('[data-testid="family-photo"]').first();
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Restore network
    await page.setOfflineMode(false);
    
    // Should automatically retry and succeed
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
  });

  test('Invalid token handling', async ({ page }) => {
    // Try invalid token
    await page.goto('/f/invalid-token-12345');
    
    // Should show error page
    await expect(page.locator('[data-testid="invalid-token"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Token no válido');
    
    // Should provide help options
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
  });

  test('Photo loading failure recovery', async ({ page }) => {
    await page.goto('/f/family-token-12345');

    // Mock photo load failure
    await page.route('**/storage/signed-url**', route => {
      route.abort('failed');
    });

    // Try to view photo
    await page.click('[data-testid="family-photo"]').first();
    
    // Should show error state
    await expect(page.locator('[data-testid="photo-error"]')).toBeVisible();
    
    // Should offer retry
    await expect(page.locator('[data-testid="retry-photo"]')).toBeVisible();
    
    // Restore route and retry
    await page.unroute('**/storage/signed-url**');
    await page.click('[data-testid="retry-photo"]');
    
    // Should load successfully
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
  });
});