#!/usr/bin/env node

/**
 * Debug script to diagnose Vercel deployment issues
 */

const VERCEL_URL = 'https://lookescolar.vercel.app';

async function getVerboseResponse(path, method = 'GET') {
  try {
    console.log(`\n🔍 Debugging ${method} ${path}`);

    const response = await fetch(`${VERCEL_URL}${path}`, {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response Details:');
    console.log('  Status:', response.status, response.statusText);
    console.log('  Headers:');

    // Check specific headers that give clues
    const importantHeaders = [
      'x-matched-path',
      'x-vercel-id',
      'x-vercel-cache',
      'x-bypass-reason',
      'content-type',
      'server'
    ];

    importantHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        console.log(`    ${header}: ${value}`);
      }
    });

    const contentType = response.headers.get('content-type') || '';
    let body = '';

    if (contentType.includes('text/html')) {
      body = await response.text();
      console.log('  Response Type: HTML (indicates error page)');

      // Extract error details from HTML
      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        console.log('  Page Title:', titleMatch[1]);
      }

      // Look for Next.js specific error info
      if (body.includes('500')) {
        console.log('  🚨 500 Internal Server Error detected');
      }
      if (body.includes('405')) {
        console.log('  🚨 405 Method Not Allowed detected');
      }

    } else if (contentType.includes('application/json')) {
      try {
        const json = await response.json();
        body = JSON.stringify(json, null, 2);
        console.log('  Response Type: JSON');
        console.log('  JSON Body:', body);
      } catch (e) {
        body = await response.text();
        console.log('  Response Type: Malformed JSON');
      }
    } else {
      body = await response.text();
      console.log('  Response Type:', contentType || 'Unknown');
    }

    // Look for routing clues
    const matchedPath = response.headers.get('x-matched-path');
    if (matchedPath) {
      console.log(`  🎯 Vercel matched this to: ${matchedPath}`);
      if (matchedPath === '/500') {
        console.log('  ❌ Route matched to error page - indicates handler not found');
      }
    }

    const bypassReason = response.headers.get('x-bypass-reason');
    if (bypassReason) {
      console.log(`  🔄 Bypass reason: ${bypassReason}`);
    }

    return { status: response.status, headers: Object.fromEntries(response.headers), body };

  } catch (error) {
    console.error(`❌ Error debugging ${path}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 VERCEL DEPLOYMENT DEBUG');
  console.log('='.repeat(50));

  // Test the problematic endpoints
  await getVerboseResponse('/api/admin/photos/simple-upload', 'POST');
  await getVerboseResponse('/api/admin/photos/simple-upload', 'GET');
  await getVerboseResponse('/api/process-preview', 'POST');

  // Test a working endpoint for comparison
  console.log('\n📋 COMPARISON - Working endpoint:');
  await getVerboseResponse('/api/health', 'GET');

  console.log('\n🧩 DIAGNOSIS SUMMARY:');
  console.log('- Check x-matched-path header to see how Vercel routes requests');
  console.log('- If matched-path is /500, the route handler is not being found');
  console.log('- Compare working vs broken endpoints for differences');
  console.log('- Look for build/compilation errors in Vercel dashboard');
}

main().catch(console.error);