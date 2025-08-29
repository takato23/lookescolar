#!/usr/bin/env npx tsx

/**
 * Simple test script for the preview route
 */

async function testPreviewRoute() {
  console.log('🧪 Testing preview route directly...\n');

  const testUrls = [
    'http://localhost:3000/admin/previews/test_preview.webp',
    'http://localhost:3000/admin/previews/H2N8O0oTc1qh_preview.webp',
  ];

  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer dev_demo_token_123',
          'Accept': 'image/webp,image/*,*/*'
        }
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const size = response.headers.get('content-length');
        console.log(`  Size: ${size || 'unknown'} bytes`);
        console.log('  ✅ Success');
      } else if (response.status === 404) {
        const body = await response.text();
        console.log(`  Body: ${body}`);
        console.log('  ⚠️ Not found (expected for non-existent files)');
      } else {
        const body = await response.text();
        console.log(`  Body: ${body}`);
        console.log('  ❌ Unexpected response');
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${(error as Error).message}`);
    }
    
    console.log('');
  }

  // Test with actual photo from database
  console.log('🔍 Testing with real photo from database...\n');
  
  try {
    const photosResponse = await fetch('http://localhost:3000/api/admin/photos?limit=1', {
      headers: {
        'Authorization': 'Bearer dev_demo_token_123'
      }
    });

    if (photosResponse.ok) {
      const data = await photosResponse.json();
      const photo = data.photos[0];
      
      if (photo) {
        console.log(`Found photo: ${photo.original_filename}`);
        console.log(`Storage path: ${photo.storage_path}`);
        console.log(`Preview path: ${photo.preview_path}`);
        console.log(`Preview URL: ${photo.preview_url}`);
        
        // Test the actual preview URL
        if (photo.preview_url) {
          console.log('\n🧪 Testing actual preview URL from API...');
          const previewResponse = await fetch(photo.preview_url);
          console.log(`Status: ${previewResponse.status} ${previewResponse.statusText}`);
          
          if (previewResponse.ok) {
            console.log('✅ Direct Supabase URL works');
          } else {
            console.log('❌ Direct Supabase URL failed');
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Failed to test real photo: ${(error as Error).message}`);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testPreviewRoute();
}

export { testPreviewRoute };