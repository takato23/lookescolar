// Test the new upload endpoint
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUpload() {
  // Create a small test file
  const testContent = Buffer.from('test image data for upload test');
  fs.writeFileSync('test-image.jpg', testContent);

  // Create form data
  const formData = new FormData();
  formData.append('files', fs.createReadStream('test-image.jpg'));
  formData.append('folder_id', 'f34608fa-6118-4369-9e71-f625fc192ce6'); // General folder

  try {
    const response = await fetch(
      'http://localhost:3000/api/admin/assets/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await response.json();
    console.log('Upload response:', JSON.stringify(result, null, 2));
    console.log('Status:', response.status);

    // Cleanup
    fs.unlinkSync('test-image.jpg');
  } catch (error) {
    console.error('Upload test error:', error.message);
    // Cleanup
    if (fs.existsSync('test-image.jpg')) {
      fs.unlinkSync('test-image.jpg');
    }
  }
}

testUpload();
