// Quick test script to check folders API
const response = await fetch('http://localhost:3000/api/admin/folders?limit=50');
const data = await response.json();
console.log('Folders:', JSON.stringify(data, null, 2));

// Also test assets for the first folder if found
if (data.folders && data.folders.length > 0) {
  const firstFolder = data.folders[0];
  console.log('\n=== Testing assets for folder:', firstFolder.name, '===');
  const assetsResponse = await fetch(`http://localhost:3000/api/admin/assets?folder_id=${firstFolder.id}&limit=50`);
  const assetsData = await assetsResponse.json();
  console.log('Assets:', JSON.stringify(assetsData, null, 2));
}