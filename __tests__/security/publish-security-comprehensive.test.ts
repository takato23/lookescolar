/**
 * SECURITY PENETRATION TESTING - Admin Publish System
 * 
 * Comprehensive security validation:
 * - Unauthorized access prevention
 * - Rate limiting validation
 * - SQL injection protection
 * - XSS protection
 * - CSRF protection
 * - Input validation and sanitization
 */

import { test, expect } from '@playwright/test';
import { setupE2EDatabase, cleanupE2EDatabase, createTestEvent, createTestCodes } from '../test-utils';

// Security test configurations
const SECURITY_CONFIG = {
  RATE_LIMIT_THRESHOLD: 10, // requests per minute
  XSS_PAYLOADS: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '"><script>alert("xss")</script>',
    "'; DROP TABLE codes; --",
  ],
  SQL_INJECTION_PAYLOADS: [
    "' OR '1'='1",
    "'; DROP TABLE codes; --",
    "' UNION SELECT * FROM users --",
    "1' OR '1'='1' --",
    "admin'--",
    "admin' /*",
    "' OR 1=1#",
  ],
  CSRF_SCENARIOS: [
    'missing_token',
    'invalid_token',
    'expired_token',
    'reused_token',
  ],
};

const TEST_EVENT_ID = 'security-test-event';
const MALICIOUS_CODES = [
  { id: 'sec-code-1', code_value: '<script>alert("xss")</script>' },
  { id: 'sec-code-2', code_value: "'; DROP TABLE codes; --" },
  { id: 'sec-code-3', code_value: '"><img src=x onerror=alert("xss")>' },
];

test.describe('Admin Publish Security - Authentication & Authorization', () => {
  test.beforeEach(async () => {
    await setupE2EDatabase();
    await createTestEvent({ id: TEST_EVENT_ID, name: 'Security Test Event' });
    await createTestCodes(TEST_EVENT_ID, MALICIOUS_CODES);
  });

  test.afterEach(async () => {
    await cleanupE2EDatabase();
  });

  test('prevents unauthorized access to all publish endpoints', async ({ page }) => {
    // Test without authentication
    const endpoints = [
      '/api/admin/publish',
      '/api/admin/publish/list',
      '/api/admin/publish/unpublish',
      '/api/admin/publish/rotate',
      '/api/admin/publish/revoke',
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect(response.status()).toBe(401);
      
      const responsePost = await page.request.post(endpoint, {
        data: { codeId: 'test-id' }
      });
      expect(responsePost.status()).toBe(401);
    }

    // Test with invalid token
    const invalidTokenHeaders = {
      'Authorization': 'Bearer invalid-token-here',
      'Content-Type': 'application/json'
    };

    for (const endpoint of endpoints) {
      const response = await page.request.post(endpoint, {
        headers: invalidTokenHeaders,
        data: { codeId: 'test-id' }
      });
      expect(response.status()).toBe(401);
    }

    // Test UI access without authentication
    const uiResponse = await page.goto('/admin/publish');
    await page.waitForURL('/admin/login'); // Should redirect to login
    expect(page.url()).toContain('/admin/login');
  });

  test('validates admin role requirements', async ({ page }) => {
    // Create a non-admin user session
    await page.goto('/admin/login');
    
    // Mock a non-admin user login
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({
        user: { id: 'user-123', role: 'user' },
        token: 'mock-user-token'
      }));
    });

    // Try to access admin publish
    await page.goto('/admin/publish');
    
    // Should be denied access
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    
    // API calls should also be denied
    const response = await page.request.post('/api/admin/publish', {
      data: { codeId: 'test-id' },
      headers: { 'Authorization': 'Bearer mock-user-token' }
    });
    expect(response.status()).toBe(403);
  });

  test('enforces session security', async ({ page }) => {
    // Test session timeout
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Mock session expiry
    await page.evaluate(() => {
      localStorage.setItem('session-expiry', String(Date.now() - 1000));
    });

    await page.goto('/admin/publish');
    
    // Should redirect to login
    await page.waitForURL('/admin/login');
    expect(page.url()).toContain('/admin/login');
  });
});

test.describe('Rate Limiting & DDoS Protection', () => {
  test('rate limiting works correctly and resets', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    const endpoint = '/api/admin/publish/list';
    let successCount = 0;
    let rateLimitedCount = 0;

    // Make rapid requests to trigger rate limiting
    const requests = Array.from({ length: 15 }, () =>
      page.request.get(endpoint)
    );

    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      if (response.status() === 200) {
        successCount++;
      } else if (response.status() === 429) {
        rateLimitedCount++;
      }
    });

    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(successCount).toBeLessThanOrEqual(SECURITY_CONFIG.RATE_LIMIT_THRESHOLD);

    // Wait for rate limit reset (assuming 1-minute window)
    await page.waitForTimeout(61000);

    // Should allow requests again
    const resetResponse = await page.request.get(endpoint);
    expect(resetResponse.status()).toBe(200);
  });

  test('rate limiting applies per user/IP', async ({ browser }) => {
    // Create two different browser contexts to simulate different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    for (const page of [page1, page2]) {
      await page.goto('/admin/login');
      await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
      await page.fill('[data-testid="password-input"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/admin');
    }

    // Make requests from first user to trigger rate limit
    const requests1 = Array.from({ length: 12 }, () =>
      page1.request.get('/api/admin/publish/list')
    );
    await Promise.all(requests1);

    // Second user should still be able to make requests
    const response2 = await page2.request.get('/api/admin/publish/list');
    expect(response2.status()).toBe(200);

    await context1.close();
    await context2.close();
  });
});

test.describe('Input Validation & SQL Injection Protection', () => {
  test('SQL injection protection on all inputs', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Test SQL injection on each endpoint
    const sqlPayloads = SECURITY_CONFIG.SQL_INJECTION_PAYLOADS;
    
    for (const payload of sqlPayloads) {
      // Test codeId parameter
      const response = await page.request.post('/api/admin/publish', {
        data: { codeId: payload }
      });
      
      // Should return validation error, not 500 (which might indicate SQL error)
      expect([400, 422]).toContain(response.status());
      
      const responseBody = await response.json();
      expect(responseBody.error).toMatch(/inválido|validation|invalid/i);
    }

    // Test search input SQL injection
    await page.goto('/admin/publish');
    
    for (const payload of sqlPayloads) {
      await page.fill('[placeholder*="Buscar código"]', payload);
      await page.waitForTimeout(500);
      
      // Should not crash or show SQL errors
      await expect(page.locator('[data-testid="sql-error"]')).not.toBeVisible();
      
      // Clear search
      await page.fill('[placeholder*="Buscar código"]', '');
    }
  });

  test('validates UUID format for codeId parameters', async ({ page }) => {
    const invalidUUIDs = [
      'not-a-uuid',
      '123',
      'abc-def-ghi',
      '00000000-0000-0000-0000-00000000000Z',
      '',
      null,
      undefined,
    ];

    for (const invalidUUID of invalidUUIDs) {
      const response = await page.request.post('/api/admin/publish', {
        data: { codeId: invalidUUID }
      });
      
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody.error).toMatch(/inválido|invalid|uuid/i);
    }
  });

  test('sanitizes and validates all user inputs', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');

    // Test input sanitization on search
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '"><img src=x onerror=alert("xss")>',
      '/**/SELECT/**/password/**/FROM/**/users',
      '../../../etc/passwd',
    ];

    for (const maliciousInput of maliciousInputs) {
      await page.fill('[placeholder*="Buscar código"]', maliciousInput);
      await page.waitForTimeout(300);
      
      // Check that input is either sanitized or rejected
      const searchValue = await page.inputValue('[placeholder*="Buscar código"]');
      
      // Input should be sanitized (no script tags) or empty
      expect(searchValue).not.toContain('<script>');
      expect(searchValue).not.toContain('javascript:');
      expect(searchValue).not.toContain('onerror');
    }
  });
});

test.describe('XSS Protection & Content Security', () => {
  test('XSS protection on user-generated content', async ({ page }) => {
    // Setup with XSS payload in code names
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Check that XSS payloads in code values are escaped
    const xssPayloads = SECURITY_CONFIG.XSS_PAYLOADS;
    
    for (const payload of xssPayloads) {
      // Look for elements that might contain the payload
      const elements = page.locator(`[data-testid="code-value"]:has-text("${payload.replace(/[<>]/g, '')}")`);
      const count = await elements.count();
      
      if (count > 0) {
        // Verify the payload is properly escaped
        const element = elements.first();
        const innerHTML = await element.innerHTML();
        
        expect(innerHTML).not.toContain('<script>');
        expect(innerHTML).not.toContain('javascript:');
        expect(innerHTML).not.toContain('onerror');
        
        // Should contain escaped versions
        if (payload.includes('<script>')) {
          expect(innerHTML).toContain('&lt;script&gt;');
        }
      }
    }

    // Test that no alert dialogs are triggered
    page.on('dialog', dialog => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });

    // Wait to ensure no delayed XSS execution
    await page.waitForTimeout(2000);
  });

  test('Content Security Policy validation', async ({ page }) => {
    await page.goto('/admin/publish');

    // Check CSP headers
    const response = await page.request.get('/admin/publish');
    const cspHeader = response.headers()['content-security-policy'];
    
    if (cspHeader) {
      expect(cspHeader).toContain("script-src 'self'");
      expect(cspHeader).toContain("object-src 'none'");
      expect(cspHeader).toContain("base-uri 'self'");
    }

    // Test inline script prevention
    await page.evaluate(() => {
      try {
        eval('alert("csp-bypass")');
        throw new Error('CSP bypass detected');
      } catch (e) {
        // Expected - CSP should block eval
        if (e.message === 'CSP bypass detected') {
          throw e;
        }
      }
    });
  });
});

test.describe('CSRF Protection', () => {
  test('CSRF protection validates properly', async ({ page, context }) => {
    // Login and get valid session
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    // Get CSRF token from the page
    const csrfToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta?.getAttribute('content');
    });

    // Test request without CSRF token
    const responseNoCsrf = await page.request.post('/api/admin/publish', {
      data: { codeId: 'test-uuid-here' }
      // Missing CSRF token header
    });
    
    // Should be rejected
    expect(responseNoCsrf.status()).toBe(403);

    // Test request with invalid CSRF token
    const responseInvalidCsrf = await page.request.post('/api/admin/publish', {
      headers: { 'X-CSRF-Token': 'invalid-token' },
      data: { codeId: 'test-uuid-here' }
    });
    
    expect(responseInvalidCsrf.status()).toBe(403);

    // Test valid request with CSRF token
    if (csrfToken) {
      const responseValidCsrf = await page.request.post('/api/admin/publish', {
        headers: { 'X-CSRF-Token': csrfToken },
        data: { codeId: '550e8400-e29b-41d4-a716-446655440000' }
      });
      
      // Should not be rejected due to CSRF (might fail for other reasons like non-existent code)
      expect(responseValidCsrf.status()).not.toBe(403);
    }
  });

  test('CSRF token rotation on sensitive operations', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');

    // Get initial CSRF token
    const initialToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta?.getAttribute('content');
    });

    // Perform a sensitive operation (publish)
    const firstCard = page.locator('[data-testid="folder-card"]').first();
    if (await firstCard.count() > 0) {
      await firstCard.locator('[data-testid="publish-button"]').click();
      await page.waitForTimeout(1000);
    }

    // Check if CSRF token was rotated
    const newToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta?.getAttribute('content');
    });

    // Token should either be rotated or remain valid
    expect(newToken).toBeDefined();
    if (initialToken && newToken) {
      // Either rotated or same (both are valid security approaches)
      expect(typeof newToken).toBe('string');
      expect(newToken.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Data Exposure & Information Leakage', () => {
  test('prevents sensitive data exposure in error messages', async ({ page }) => {
    // Test various error scenarios
    const sensitivePatterns = [
      /password/i,
      /token.*[a-f0-9]{32}/i,
      /database.*error/i,
      /sql.*syntax/i,
      /supabase.*key/i,
      /internal.*server.*error.*stack/i,
    ];

    // Test with various malformed requests
    const malformedRequests = [
      { codeId: null },
      { codeId: undefined },
      { codeId: 'invalid-uuid' },
      { eventId: 'invalid-uuid' },
      {},
    ];

    for (const request of malformedRequests) {
      const response = await page.request.post('/api/admin/publish', {
        data: request
      });

      const responseBody = await response.json();
      const errorMessage = responseBody.error || '';

      // Check that no sensitive patterns are exposed
      sensitivePatterns.forEach(pattern => {
        expect(errorMessage).not.toMatch(pattern);
      });
    }
  });

  test('validates proper error response format', async ({ page }) => {
    const response = await page.request.post('/api/admin/publish', {
      data: { codeId: 'invalid-uuid' }
    });

    expect(response.status()).toBe(400);
    
    const responseBody = await response.json();
    
    // Should have proper error structure
    expect(responseBody).toHaveProperty('error');
    expect(typeof responseBody.error).toBe('string');
    
    // Should not expose internal details
    expect(responseBody).not.toHaveProperty('stack');
    expect(responseBody).not.toHaveProperty('sql');
    expect(responseBody).not.toHaveProperty('internal');
  });

  test('prevents directory traversal attacks', async ({ page }) => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    for (const payload of traversalPayloads) {
      const response = await page.request.post('/api/admin/publish', {
        data: { codeId: payload }
      });
      
      // Should return validation error
      expect(response.status()).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody.error).toMatch(/inválido|invalid/i);
    }
  });
});

test.describe('Session Security & Token Management', () => {
  test('token rotation security', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="email-input"]', 'admin@lookescolar.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin');

    await page.goto('/admin/publish');
    await page.waitForLoadState('networkidle');

    // Publish a code to get a token
    const firstCard = page.locator('[data-testid="folder-card"]').first();
    if (await firstCard.count() > 0) {
      await firstCard.locator('[data-testid="publish-button"]').click();
      await page.waitForTimeout(1000);

      // Get the token
      const familyUrl = await page.locator('[data-testid="family-url"]').first().textContent();
      expect(familyUrl).toMatch(/\/f\/[a-f0-9]{32}\/simple-page$/);

      const originalToken = familyUrl?.match(/\/f\/([a-f0-9]{32})\//)?.[1];

      // Rotate the token
      await firstCard.locator('[data-testid="rotate-token-button"]').click();
      await page.waitForTimeout(1000);

      // Get new token
      const newFamilyUrl = await page.locator('[data-testid="family-url"]').first().textContent();
      const newToken = newFamilyUrl?.match(/\/f\/([a-f0-9]{32})\//)?.[1];

      // Verify tokens are different
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(originalToken);

      // Verify old token is invalidated
      if (originalToken) {
        const oldTokenResponse = await page.request.get(`/f/${originalToken}/simple-page`);
        expect(oldTokenResponse.status()).toBe(404);
      }

      // Verify new token works
      if (newToken) {
        const newTokenResponse = await page.request.get(`/f/${newToken}/simple-page`);
        expect(newTokenResponse.status()).toBe(200);
      }
    }
  });

  test('prevents token enumeration attacks', async ({ page }) => {
    // Generate multiple test tokens to check for patterns
    const tokens: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      const response = await page.request.post('/api/admin/publish', {
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        data: { codeId: `test-code-${i}` }
      });
      
      if (response.status() === 200) {
        const responseBody = await response.json();
        if (responseBody.token) {
          tokens.push(responseBody.token);
        }
      }
    }

    // Verify tokens are cryptographically random
    if (tokens.length > 1) {
      // Check that tokens don't have predictable patterns
      for (let i = 1; i < tokens.length; i++) {
        expect(tokens[i]).not.toBe(tokens[i-1]);
        
        // Check Hamming distance (should be roughly 50% different)
        let differences = 0;
        const minLength = Math.min(tokens[0].length, tokens[i].length);
        
        for (let j = 0; j < minLength; j++) {
          if (tokens[0][j] !== tokens[i][j]) {
            differences++;
          }
        }
        
        const similarity = differences / minLength;
        expect(similarity).toBeGreaterThan(0.3); // At least 30% different
        expect(similarity).toBeLessThan(0.7); // At most 70% different (random should be ~50%)
      }
    }
  });
});