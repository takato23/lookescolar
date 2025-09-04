import { test, expect } from '@playwright/test';

// Record videos for this suite to provide visual evidence
test.use({ video: 'on' });

const SHARE_TOKEN = process.env.E2E_SHARE_TOKEN; // 64-hex token
const HIER_TOKEN = process.env.E2E_HIER_TOKEN;   // E_/C_/F_ token

test.describe('Unified Store Token Adapter', () => {
  test('Legacy share token → gallery → store-unified', async ({ page }, testInfo) => {
    test.skip(!SHARE_TOKEN, 'E2E_SHARE_TOKEN not provided');

    // 1) Open public gallery
    await page.goto(`/share/${SHARE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    // 2) Validate first items visible
    await expect(page.getByText(/Galería del evento|Álbum compartido|Fotos seleccionadas/)).toBeVisible();

    // 3) Click Comprar → store-unified
    await page.getByRole('button', { name: /Comprar/i }).click();
    await page.waitForURL(/\/store-unified\//);
    await expect(page).toHaveURL(new RegExp(`/store-unified/${SHARE_TOKEN}`));

    // 4) Validate store loads photos
    await expect(page.getByText(/Selecciona tu Paquete/)).toBeVisible();
  });

  test('Hierarchical token (E/C/F) → store-unified', async ({ page }) => {
    test.skip(!HIER_TOKEN, 'E2E_HIER_TOKEN not provided');

    await page.goto(`/store-unified/${HIER_TOKEN}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Selecciona tu Paquete/)).toBeVisible();
  });
});

