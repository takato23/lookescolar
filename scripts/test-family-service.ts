import { config } from 'dotenv';
import { FamilyService } from '../lib/services/family.service';

config({ path: '.env.local' });

console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFamilyService() {
  console.log('Testing family service directly...');
  
  const familyService = new FamilyService();
  
  try {
    // Test token validation
    console.log('Test 1: Validating token...');
    const startTime1 = Date.now();
    const subject = await familyService.getSubjectByToken('j9oMwpi6o9wVt4Q4YziD');
    const duration1 = Date.now() - startTime1;
    console.log(`Token validation took ${duration1}ms`);
    console.log('Subject:', subject);
    
    if (!subject) {
      console.log('Invalid token or subject not found');
      return;
    }
    
    // Test getting subject photos
    console.log('\nTest 2: Getting subject photos...');
    const startTime2 = Date.now();
    const photos = await familyService.getSubjectPhotos(subject.id, 1, 10);
    const duration2 = Date.now() - startTime2;
    console.log(`Getting subject photos took ${duration2}ms`);
    console.log(`Found ${photos.photos.length} photos`);
    console.log('Photos:', photos.photos.slice(0, 2)); // Show first 2 photos
    
  } catch (error) {
    console.error('Error testing family service:', error);
  }
}

testFamilyService().catch(console.error);