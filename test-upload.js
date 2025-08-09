const fs = require('fs');
const path = require('path');

// Crear una imagen de prueba simple (1x1 pixel rojo en formato PNG)
const redPixel = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
  0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
  0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
  0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Guardar la imagen de prueba
fs.writeFileSync('test-image.png', redPixel);

// Crear FormData y subir
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  const form = new FormData();
  form.append('files', fs.createReadStream('test-image.png'), 'test-image.png');

  try {
    const response = await fetch('http://localhost:3000/api/admin/photos/simple-upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Limpiar archivo de prueba
    fs.unlinkSync('test-image.png');
  }
}

testUpload();