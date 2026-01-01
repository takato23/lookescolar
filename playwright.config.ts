import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for comprehensive usability testing
 */
export default defineConfig({
  testDir: './__tests__',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'test-reports/playwright-report' }],
    ['json', { outputFile: 'test-reports/playwright-results.json' }],
    process.env['CI'] ? ['github'] : ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Accessibility Testing
    {
      name: 'accessibility',
      testMatch: '**/accessibility-comprehensive.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Responsive Design Testing
    {
      name: 'responsive-desktop',
      testMatch: '**/responsive-design.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'responsive-tablet',
      testMatch: '**/responsive-design.test.ts',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'responsive-mobile',
      testMatch: '**/responsive-design.test.ts',
      use: { ...devices['iPhone 14'] },
    },

    // User Journey Testing
    {
      name: 'workflows',
      testMatch: '**/user-journey-workflows.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Performance Testing
    {
      name: 'performance',
      testMatch: '**/performance-web-vitals.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Throttle network for realistic testing
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=TranslateUI'],
        },
      },
    },

    // Cross-Browser Testing
    {
      name: 'chrome',
      testMatch: '**/cross-browser-compatibility.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: '**/cross-browser-compatibility.test.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'safari',
      testMatch: '**/cross-browser-compatibility.test.ts',
      use: { ...devices['Desktop Safari'] },
    },

    // Visual Regression Testing
    {
      name: 'visual-desktop',
      testMatch: '**/visual-regression.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent screenshots
        launchOptions: {
          args: [
            '--disable-animations',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
    },
    {
      name: 'visual-mobile',
      testMatch: '**/visual-regression.test.ts',
      use: { ...devices['iPhone 14'] },
    },

    // Error Handling Testing
    {
      name: 'error-handling',
      testMatch: '**/error-handling-edge-cases.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Allow testing offline scenarios
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
      },
    },

    // Mobile Testing (Touch interactions)
    {
      name: 'mobile-touch',
      testMatch: [
        '**/responsive-design.test.ts',
        '**/user-journey-workflows.test.ts',
        '**/error-handling-edge-cases.test.ts',
      ],
      use: {
        ...devices['iPhone 14'],
        hasTouch: true,
        isMobile: true,
      },
    },

    // Tablet Testing
    {
      name: 'tablet',
      testMatch: [
        '**/responsive-design.test.ts',
        '**/user-journey-workflows.test.ts',
      ],
      use: {
        ...devices['iPad Pro'],
        hasTouch: true,
      },
    },

    // E2E General Testing
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.test.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Test fixtures and setup
  globalSetup: './__tests__/global-setup.ts',
  globalTeardown: './__tests__/global-teardown.ts',

  // Web Server (for local development)
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000, // 2 minutes to start
  },
});
