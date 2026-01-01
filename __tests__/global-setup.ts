/**
 * @fileoverview Global test setup for Playwright
 * Prepares test environment and data before running tests
 */

import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global test environment...');

  // Create test directories

  const testDirs = [
    'test-reports/usability',
    'test-reports/screenshots',
    'test-reports/videos',
    '__tests__/fixtures',
  ];

  for (const dir of testDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  }

  // Create sample test fixtures if they don't exist
  const fixtures = [
    {
      name: 'sample-photo.jpg',
      content:
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAEAAQAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/oooor//2Q==',
    },
    {
      name: 'students.csv',
      content: `name,grade,email
Ana García López,5A,ana.garcia@example.com
Carlos Rodríguez Silva,5A,carlos.rodriguez@example.com
María Fernández Torres,5B,maria.fernandez@example.com`,
    },
  ];

  for (const fixture of fixtures) {
    const fixturePath = path.join(
      process.cwd(),
      '__tests__/fixtures',
      fixture.name
    );
    if (!fs.existsSync(fixturePath)) {
      if (fixture.content.startsWith('data:')) {
        // Handle base64 images
        const base64Data = fixture.content.replace(
          /^data:image\/\w+;base64,/,
          ''
        );
        fs.writeFileSync(fixturePath, base64Data, 'base64');
      } else {
        fs.writeFileSync(fixturePath, fixture.content);
      }
      console.log(`✅ Created fixture: ${fixture.name}`);
    }
  }

  // Setup test authentication tokens
  const testTokens = {
    adminToken: 'admin-test-token-12345',
    familyToken: 'family-token-12345',
    expiredToken: 'expired-token-12345',
    invalidToken: 'invalid-token-12345',
  };

  console.log('✅ Test tokens configured');

  // Verify development server is accessible
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const maxRetries = 30;
    let retries = 0;
    let serverReady = false;

    while (retries < maxRetries && !serverReady) {
      try {
        const response = await page.goto('http://localhost:3000');
        if (response && response.ok()) {
          serverReady = true;
          console.log('✅ Development server is ready');
        }
      } catch (error) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(`⏳ Waiting for server... (${retries}/${maxRetries})`);
      }
    }

    await browser.close();

    if (!serverReady) {
      throw new Error('Development server not accessible after 60 seconds');
    }
  } catch (error) {
    console.error('❌ Server check failed:', error);
    throw error;
  }

  // Log environment info
  console.log('🌍 Test Environment:');
  console.log(`  - Node.js: ${process.version}`);
  console.log(`  - Platform: ${process.platform}`);
  console.log(`  - CI: ${process.env.CI || 'false'}`);
  console.log(
    `  - Base URL: ${config.projects[0]?.use?.baseURL || 'http://localhost:3000'}`
  );

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
