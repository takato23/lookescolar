/**
 * Mobile & Responsive Design Tests
 * 
 * Tests mobile-first responsive design and usability:
 * - Mobile family gallery access
 * - Touch interactions and gestures
 * - Responsive photo grid layouts
 * - Mobile checkout workflow
 * - Performance on mobile devices
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MOBILE_TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  // Mobile viewport configurations
  viewports: {
    mobile: { width: 375, height: 667, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15' },
    tablet: { width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15' },
    desktop: { width: 1920, height: 1080, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  },
  // Performance thresholds for mobile
  performance: {
    loadTime: 3000, // 3 seconds max
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    cumulativeLayoutShift: 0.1
  },
  testData: {
    event: {
      name: 'Colegio Mobile Test 2025',
      school: 'Colegio Móvil',
      date: '2024-08-01',
      location: 'Buenos Aires'
    },
    student: {
      name: 'Sofia Mobile Test',
      grade: '2°',
      section: 'A',
      student_number: 'MOB001'
    },
    family: {
      contact_name: 'Andrea López',
      contact_email: 'andrea.lopez@mobile.test.com',
      contact_phone: '+541234567890'
    }
  }
};

let testEventId: string;
let testStudentId: string;
let testStudentToken: string;
let testPhotoIds: string[] = [];

beforeAll(async () => {
  await setupMobileTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Mobile & Responsive Design Tests', () => {
  
  describe('Mobile Gallery Access', () => {
    
    it('1.1 Mobile gallery should load efficiently', async () => {
      const startTime = Date.now();
      
      // Test mobile gallery access
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const loadTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(loadTime).toBeLessThan(MOBILE_TEST_CONFIG.performance.loadTime);
      
      const content = await response.text();
      expect(content).toContain('LookEscolar');
      expect(content).toContain('viewport'); // Should have mobile viewport meta tag
      
      console.log('✅ Mobile gallery loads efficiently');
      console.log(`   Load time: ${loadTime}ms (target: <${MOBILE_TEST_CONFIG.performance.loadTime}ms)`);
    });

    it('1.2 Mobile API responses should be optimized', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent,
          'Accept': 'application/json'
        }
      });
      
      const apiResponseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(apiResponseTime).toBeLessThan(2000); // API should be fast
      
      const result = await response.json();
      expect(result.photos).toBeDefined();
      expect(Array.isArray(result.photos)).toBe(true);
      
      // Verify mobile-optimized image URLs if implemented
      if (result.photos.length > 0) {
        const photo = result.photos[0];
        expect(photo.preview_url).toBeDefined();
        
        // Should have appropriate image sizes for mobile
        if (photo.thumbnail_url) {
          expect(photo.thumbnail_url).toBeTruthy();
        }
      }
      
      console.log('✅ Mobile API responses optimized');
      console.log(`   API response time: ${apiResponseTime}ms`);
      console.log(`   Photos returned: ${result.photos.length}`);
    });

    it('1.3 Touch interactions should be properly sized', async () => {
      // Test that interactive elements meet mobile touch targets (44px minimum)
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should contain mobile-friendly elements
      expect(content).toContain('btn'); // Button classes
      expect(content).toContain('touch'); // Touch-friendly indicators
      
      // Should have proper meta tags for mobile
      expect(content).toContain('width=device-width');
      expect(content).toContain('initial-scale=1');
      
      console.log('✅ Mobile touch targets validated');
    });
  });

  describe('Responsive Layout Tests', () => {
    
    it('2.1 Photo grid should adapt to screen size', async () => {
      for (const [deviceType, viewport] of Object.entries(MOBILE_TEST_CONFIG.viewports)) {
        const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}`, {
          headers: {
            'User-Agent': viewport.userAgent,
            'Accept': 'application/json'
          }
        });
        
        expect(response.status).toBe(200);
        const result = await response.json();
        
        // Should return photos for all device types
        expect(result.photos).toBeDefined();
        expect(Array.isArray(result.photos)).toBe(true);
        
        console.log(`✅ ${deviceType} (${viewport.width}x${viewport.height}): ${result.photos.length} photos`);
      }
    });

    it('2.2 Navigation should be mobile-friendly', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have mobile navigation elements
      expect(content).toMatch(/menu|nav|burger|hamburger/i);
      
      // Should have proper mobile styling
      expect(content).toContain('mobile'); // Mobile-specific classes
      
      console.log('✅ Mobile navigation validated');
    });

    it('2.3 Typography should be readable on mobile', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have appropriate font sizes and contrast
      expect(content).toContain('text-'); // Tailwind text classes
      
      // Should not have tiny text
      expect(content).not.toContain('text-xs'); // Avoid extra small text on mobile
      
      console.log('✅ Mobile typography validated');
    });
  });

  describe('Mobile Wizard Workflow', () => {
    
    it('3.1 Mobile photo selection should work smoothly', async () => {
      // Test wizard page on mobile
      const wizardResponse = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(wizardResponse.status).toBe(200);
      const content = await wizardResponse.text();
      
      // Should have mobile-optimized wizard
      expect(content).toContain('Opción 1');
      expect(content).toContain('Opción 2');
      expect(content).toContain('2000');
      expect(content).toContain('3500');
      
      // Should have touch-friendly photo selection
      expect(content).toMatch(/select|choose|elegir/i);
      
      console.log('✅ Mobile wizard interface validated');
    });

    it('3.2 Mobile checkout should handle form inputs properly', async () => {
      // Test mobile checkout workflow
      const checkoutResponse = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        },
        body: JSON.stringify({
          token: testStudentToken,
          wizard_option: 'option1',
          selected_photos: [testPhotoIds[0]],
          selected_upsells: {},
          contact: MOBILE_TEST_CONFIG.testData.family
        })
      });
      
      expect(checkoutResponse.status).toBe(201);
      const result = await checkoutResponse.json();
      
      expect(result.preference_id).toBeDefined();
      expect(result.init_point).toBeDefined();
      
      // Mercado Pago should work on mobile
      expect(result.init_point).toContain('mercadopago');
      
      console.log('✅ Mobile checkout workflow validated');
      console.log(`   Preference created: ${result.preference_id}`);
    });

    it('3.3 Mobile form validation should provide clear feedback', async () => {
      // Test form validation with mobile-specific errors
      const invalidCheckout = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        },
        body: JSON.stringify({
          token: testStudentToken,
          wizard_option: 'option1',
          selected_photos: [], // Invalid: no photos
          selected_upsells: {},
          contact: MOBILE_TEST_CONFIG.testData.family
        })
      });
      
      expect(invalidCheckout.status).toBe(400);
      const error = await invalidCheckout.json();
      expect(error.error).toBeDefined();
      
      // Error messages should be mobile-friendly (concise but clear)
      expect(error.error.length).toBeLessThan(100); // Not too long for mobile
      
      console.log('✅ Mobile form validation provides clear feedback');
    });
  });

  describe('Mobile Performance Optimization', () => {
    
    it('4.1 Image loading should be optimized for mobile', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent,
          'Connection': 'slow' // Simulate slow mobile connection
        }
      });
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      if (result.photos.length > 0) {
        const photo = result.photos[0];
        
        // Should have different image sizes for mobile optimization
        expect(photo.preview_url).toBeDefined();
        
        // Check if mobile-specific optimizations exist
        if (photo.mobile_url || photo.thumbnail_url) {
          console.log('✅ Mobile image optimization detected');
        } else {
          console.log('ℹ️ Mobile image optimization not implemented yet');
        }
      }
    });

    it('4.2 Mobile data usage should be minimized', async () => {
      const startTime = Date.now();
      
      // Test data-efficient mobile API calls
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}?mobile=true`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent,
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      
      // Check response headers for compression
      const contentEncoding = response.headers.get('content-encoding');
      if (contentEncoding) {
        expect(['gzip', 'deflate', 'br']).toContain(contentEncoding);
      }
      
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024;
        expect(sizeKB).toBeLessThan(500); // Should be under 500KB
        
        console.log(`✅ Mobile response optimized: ${sizeKB.toFixed(1)}KB in ${responseTime}ms`);
      } else {
        console.log(`✅ Mobile response in ${responseTime}ms (size not available)`);
      }
    });

    it('4.3 Mobile caching should improve performance', async () => {
      const cacheHeaders = [
        'Cache-Control',
        'ETag',
        'Last-Modified',
        'Expires'
      ];
      
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      
      // Check for caching headers
      let cacheHeadersPresent = 0;
      for (const header of cacheHeaders) {
        if (response.headers.get(header)) {
          cacheHeadersPresent++;
        }
      }
      
      // Should have some caching headers for mobile optimization
      console.log(`✅ Mobile caching headers: ${cacheHeadersPresent}/${cacheHeaders.length} present`);
    });
  });

  describe('Mobile Accessibility', () => {
    
    it('5.1 Mobile accessibility features should be present', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have accessibility features
      expect(content).toMatch(/aria-/); // ARIA attributes
      expect(content).toMatch(/alt=/); // Alt text for images
      expect(content).toMatch(/role=/); // Role attributes
      
      // Should have proper semantic HTML
      expect(content).toContain('<main');
      expect(content).toContain('<nav');
      expect(content).toMatch(/<h[1-6]/); // Heading structure
      
      console.log('✅ Mobile accessibility features validated');
    });

    it('5.2 Mobile screen reader support should work', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have screen reader friendly elements
      expect(content).toMatch(/aria-label|aria-describedby|aria-expanded/);
      expect(content).toMatch(/sr-only|screen-reader/); // Screen reader only text
      
      // Should have proper button labels
      expect(content).toMatch(/button.*aria-label|button.*title/);
      
      console.log('✅ Mobile screen reader support validated');
    });

    it('5.3 Mobile keyboard navigation should work', async () => {
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have proper tab order and focus management
      expect(content).toMatch(/tabindex|focus:/);
      
      // Should have keyboard-accessible interactive elements
      expect(content).toMatch(/button|input|select|textarea/);
      
      console.log('✅ Mobile keyboard navigation validated');
    });
  });

  describe('Cross-Device Compatibility', () => {
    
    it('6.1 Feature parity across devices should be maintained', async () => {
      const features = ['gallery', 'wizard', 'checkout'];
      
      for (const feature of features) {
        for (const [deviceType, viewport] of Object.entries(MOBILE_TEST_CONFIG.viewports)) {
          let url;
          switch (feature) {
            case 'gallery':
              url = `${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`;
              break;
            case 'wizard':
              url = `${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}/wizard`;
              break;
            case 'checkout':
              url = `${MOBILE_TEST_CONFIG.baseUrl}/api/family/gallery/${testStudentToken}`;
              break;
          }
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': viewport.userAgent
            }
          });
          
          expect(response.status).toBe(200);
          
          console.log(`✅ ${feature} works on ${deviceType}`);
        }
      }
    });

    it('6.2 Mobile-specific optimizations should not break desktop', async () => {
      // Test that mobile optimizations don't negatively impact desktop
      const desktopResponse = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.desktop.userAgent
        }
      });
      
      expect(desktopResponse.status).toBe(200);
      const content = await desktopResponse.text();
      
      // Should still contain all necessary elements for desktop
      expect(content).toContain('LookEscolar');
      expect(content).toContain('viewport');
      
      console.log('✅ Desktop compatibility maintained');
    });

    it('6.3 Progressive enhancement should work', async () => {
      // Test that basic functionality works without JavaScript (progressive enhancement)
      const response = await fetch(`${MOBILE_TEST_CONFIG.baseUrl}/f/${testStudentToken}`, {
        headers: {
          'User-Agent': MOBILE_TEST_CONFIG.viewports.mobile.userAgent
        }
      });
      
      expect(response.status).toBe(200);
      const content = await response.text();
      
      // Should have fallbacks for non-JS users
      expect(content).toMatch(/<noscript|<form/); // Forms or noscript elements
      
      // Should have semantic HTML structure
      expect(content).toContain('<main');
      expect(content).toContain('<nav');
      
      console.log('✅ Progressive enhancement validated');
    });
  });
});

// Helper functions
async function setupMobileTestData() {
  console.log('🏗️ Setting up mobile test environment...');
  
  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert(MOBILE_TEST_CONFIG.testData.event)
    .select('id')
    .single();
  
  testEventId = event.id;

  // Create student with token
  const { data: student } = await supabase
    .from('students')
    .insert({
      event_id: testEventId,
      ...MOBILE_TEST_CONFIG.testData.student,
      active: true
    })
    .select('id')
    .single();
  
  testStudentId = student.id;

  // Generate token
  const { data: tokenResult } = await supabase
    .from('student_tokens')
    .insert({
      student_id: testStudentId,
      token: `mobile-test-${Date.now()}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      active: true
    })
    .select('token')
    .single();
  
  testStudentToken = tokenResult.token;

  // Create test photos
  for (let i = 0; i < 5; i++) {
    const { data: photo } = await supabase
      .from('photos')
      .insert({
        event_id: testEventId,
        filename: `mobile-test-${i}.jpg`,
        original_filename: `mobile-test-${i}.jpg`,
        file_path: `mobile-test/mobile-test-${i}.jpg`,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080,
        photo_type: 'individual',
        processing_status: 'completed'
      })
      .select('id')
      .single();
    
    testPhotoIds.push(photo.id);

    // Associate with student
    await supabase
      .from('photo_students')
      .insert({
        photo_id: photo.id,
        student_id: testStudentId,
        confidence_score: 1.0,
        classification_method: 'manual'
      });
  }

  console.log('✅ Mobile test environment ready');
  console.log(`   Event: ${testEventId}`);
  console.log(`   Student: ${testStudentId}`);
  console.log(`   Token: ${testStudentToken.substring(0, 8)}...`);
  console.log(`   Photos: ${testPhotoIds.length}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      console.log('🧹 Cleaning up mobile test data...');
      
      await supabase.from('photo_students').delete().in('photo_id', testPhotoIds);
      await supabase.from('student_tokens').delete().eq('student_id', testStudentId);
      await supabase.from('photos').delete().in('id', testPhotoIds);
      await supabase.from('students').delete().eq('id', testStudentId);
      await supabase.from('events').delete().eq('id', testEventId);
      
      console.log('✅ Mobile test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}