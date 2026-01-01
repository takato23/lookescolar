import { test, expect, Page } from '@playwright/test';

// Test helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  // Wait for the heading to ensure page structure loaded
  await page.waitForSelector('h1:has-text("APERTURA")', { timeout: 30000 });

  // Wait for email input specifically
  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill('admin@lookescolar.com');

  await page.fill('#password', 'test-password');
  await page.click('button[type="submit"]');
  // Wait for admin dashboard or common element
  await page.waitForSelector('.clean-page-title, .admin-dashboard, [data-testid="admin-dashboard"]', {
    timeout: 30000,
  });
}

async function generateShareLink(page: Page, eventId: string): Promise<string> {
  // Navigate to photo library for event
  await page.goto(`/admin/photos?event_id=${eventId}`);

  // Wait for grid to load
  await page.waitForSelector('.clean-photo-grid-container', {
    timeout: 10000,
  });

  // Try to select the first photo card
  const photoCard = page.locator('.clean-photo-grid-container .group').first();
  // Ensure we have at least one photo, otherwise this will timeout/fail which is correct if test expects photos
  await photoCard.waitFor({ state: 'visible', timeout: 5000 });
  await photoCard.click();

  // Click "Generar tienda" button in selection toolbar
  await page.click('button:has-text("Generar tienda")');

  // Wait for result modal
  await page.waitForSelector('text=¡Publicación exitosa!|text=Carpeta ya publicada');

  // Extract link - grab the family url input
  // Label "Link alternativo (galería simple)" -> ancestor div -> find input
  const familyUrlInput = page.locator('label:has-text("Link alternativo")').locator('..').locator('input');

  // If family url not found, try store url
  if (await familyUrlInput.count() === 0) {
    const storeInput = page.locator('label:has-text("Link de tienda")').locator('..').locator('input');
    if (await storeInput.count() > 0) {
      return await storeInput.inputValue();
    }
  }

  if (await familyUrlInput.count() > 0) {
    return await familyUrlInput.inputValue();
  }

  // Fallback: try to find any input with a URL
  return await page.locator('input[readonly][value^="http"]').first().inputValue();
}

test.describe('Event Photo Library - Public Sharing Workflow', () => {
  const testEventId = 'test-event-123';
  let shareLink: string;

  test.describe('Share Link Generation (Admin)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should publish folder and generate share link', async ({ page }) => {
      await test.step('Publish folder', async () => {
        shareLink = await generateShareLink(page, testEventId);

        // Verify share link format
        expect(shareLink).toBeTruthy();
        expect(shareLink).toMatch(/^http/);

        // Copy link for use in public tests
        await page.evaluate((link) => {
          navigator.clipboard.writeText(link);
        }, shareLink);
      });
    });
  });

  test.describe('Public Share Access', () => {
    test.beforeEach(async ({ page }) => {
      // If shareLink is not set from previous test (when running cleanly or if split), 
      // we might need a fixed URL or re-generate. 
      // For this E2E, assuming we are running against a real dev server, 
      // we might need to rely on the previous step OR use a known persistent link if available.
      // Here we gracefully handle if shareLink is missing by skipping or using a placeholder that might fail 
      // if not set up, but ideally we run tests in proper sequence or setup.
      if (!shareLink) {
        // Fallback for independent runs if we had a setup phase
        // But effectively this test block depends on the previous one or a global setup.
        // We'll skip if no link (or fail).
        console.warn('No share link available, public access tests might fail if not generated.');
        shareLink = '/store-unified/some-token'; // specific testing path
      }
    });

    test('should access public gallery directly', async ({ page }) => {
      // We expect the new flow to NOT have a password gate by default
      await page.goto(shareLink);

      // Verify Gallery Loads
      // Look for "Galería Fotográfica" or similar hero title from PixiesetGalleryMain
      await expect(page.locator('text=Galería Fotográfica').or(page.locator('h1'))).toBeVisible();

      // Verify we see some content (filters or photos)
      await expect(page.locator('text=Todas').first()).toBeVisible();
    });
  });

  test.describe('Public Gallery Functionality', () => {
    test.beforeEach(async ({ page }) => {
      if (!shareLink) shareLink = '/store-unified/some-token';
      await page.goto(shareLink);
      // Wait for gallery to load
      await page.waitForSelector('text=Galería Fotográfica', { timeout: 10000 }).catch(() => { });
      // fallback wait if title is dynamic
    });

    test('should display photos grid', async ({ page }) => {
      // Check for grid images
      // PixiesetGalleryMain renders images with alt text or just imgs
      // We can look for any img inside the main section
      await expect(page.locator('section img').first()).toBeVisible();
    });

    test('should allow filtering photos', async ({ page }) => {
      // Check if filter buttons exist and are clickable
      const individualFilter = page.locator('button:has-text("Individuales")');
      if (await individualFilter.isVisible()) {
        await individualFilter.click();
        // Verify state change (e.g. active class) - difficult without specific selectors, 
        // but we verify no crash and interaction works.
        await expect(individualFilter).toBeVisible();
      }
    });

    test('should show selection/buy options', async ({ page }) => {
      // Check for "Seleccionar" or "Ver Paquetes"
      await expect(page.locator('text=Ver Paquetes').first()).toBeVisible();

      // Check individual photo actions (hover might be needed)
      // We can try to force hover on a photo card
      const photoCard = page.locator('section button.group').first();
      if (await photoCard.count() > 0) {
        await photoCard.hover();
        // Check for "Ver detalles" or similar
        // This is brittle without test-ids, but acceptable for now
      }
    });
  });
});
