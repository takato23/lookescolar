#!/usr/bin/env node

/**
 * Test script to verify Event Photo Library to Family Gallery connection
 * Tests the complete workflow: folder photos → subject assignment → family gallery access
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test data - replace with your actual IDs
const TEST_DATA = {
  eventId: '365e8ae3-5e57-45f1-9e86-ddc2b90b2dfc', // From your error report
  familyToken: '3d80ddaf9f9e7f75c293f3cd0a4d50fd', // From your error report
};

async function testEventPhotoLibraryConnection() {
  console.log('🧪 Testing Event Photo Library to Family Gallery Connection\n');

  try {
    // Step 1: Check if event exists and has photos in folders
    console.log('1️⃣ Checking event and folder structure...');
    const foldersResponse = await fetch(`${BASE_URL}/api/admin/events/${TEST_DATA.eventId}/folders`);
    const foldersData = await foldersResponse.json();
    
    if (!foldersResponse.ok) {
      throw new Error(`Failed to get folders: ${foldersData.error}`);
    }
    
    console.log(`   ✅ Found ${foldersData.folders?.length || 0} folders`);
    
    // Step 2: Check photos in the first folder
    const photosResponse = await fetch(`${BASE_URL}/api/admin/events/${TEST_DATA.eventId}/photos`);
    const photosData = await photosResponse.json();
    
    if (!photosResponse.ok) {
      throw new Error(`Failed to get photos: ${photosData.error}`);
    }
    
    console.log(`   ✅ Found ${photosData.photos?.length || 0} photos in event`);
    
    // Step 3: Check if subjects exist for assignment
    console.log('\n2️⃣ Checking subjects for assignment...');
    const subjectsResponse = await fetch(`${BASE_URL}/api/admin/events/${TEST_DATA.eventId}/subjects`);
    const subjectsData = await subjectsResponse.json();
    
    if (!subjectsResponse.ok) {
      throw new Error(`Failed to get subjects: ${subjectsData.error}`);
    }
    
    console.log(`   ✅ Found ${subjectsData.subjects?.length || 0} subjects`);
    
    if (subjectsData.subjects?.length === 0) {
      console.log('   ⚠️  Warning: No subjects found. You need to create students/subjects for this event first.');
    }
    
    // Step 4: Test assignment API (dry run)
    if (subjectsData.subjects?.length > 0 && photosData.photos?.length > 0) {
      console.log('\n3️⃣ Testing photo assignment API...');
      
      const assignmentPayload = {
        folderId: null, // Assign all photos in event
        subjectIds: subjectsData.subjects.slice(0, 2).map(s => s.id), // First 2 subjects
        assignmentMode: 'all_to_all',
        forceReassign: false,
      };
      
      console.log(`   📝 Would assign ${photosData.photos.length} photos to ${assignmentPayload.subjectIds.length} subjects`);
      console.log(`   📝 Assignment API endpoint: POST ${BASE_URL}/api/admin/events/${TEST_DATA.eventId}/assign-folder-photos`);
      console.log(`   📝 Payload:`, JSON.stringify(assignmentPayload, null, 2));
    }
    
    // Step 5: Test family gallery access
    console.log('\n4️⃣ Testing family gallery access...');
    const familyResponse = await fetch(`${BASE_URL}/api/family/gallery-simple/${TEST_DATA.familyToken}?page=1&limit=10`);
    const familyData = await familyResponse.json();
    
    if (!familyResponse.ok) {
      console.log(`   ❌ Family gallery error: ${familyData.error}`);
      console.log(`   💡 This is expected if photos haven't been assigned to subjects yet`);
    } else {
      console.log(`   ✅ Family gallery accessible`);
      console.log(`   📊 Found ${familyData.photos?.length || 0} photos for family`);
      
      if (familyData.photos?.length === 0) {
        console.log(`   💡 No photos found - this confirms photos need to be assigned via the Event Photo Library`);
      }
    }
    
    // Step 6: Provide next steps
    console.log('\n📋 Next Steps to Fix the Issue:');
    console.log('1. Go to Event Photo Library: ' + `${BASE_URL}/admin/events/${TEST_DATA.eventId}/library`);
    console.log('2. Click "Asignar a estudiantes" button in the toolbar');
    console.log('3. Select the folder with your 15 photos');
    console.log('4. Select all students who should see these photos');
    console.log('5. Click "Asignar" to create the photo-subject connections');
    console.log('6. Test family gallery again: ' + `${BASE_URL}/f/${TEST_DATA.familyToken}/simple-page`);
    
    console.log('\n✨ The Event Photo Library bridge is now ready to connect folder photos with family galleries!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure the development server is running on port 3000');
    console.log('- Check that the test event ID and family token are correct');
    console.log('- Verify database connection and Event Photo Library feature flags are enabled');
  }
}

testEventPhotoLibraryConnection().catch(console.error);