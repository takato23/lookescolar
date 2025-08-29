const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createTestImage() {
  try {
    // Crear una imagen de prueba con sharp
    const width = 800;
    const height = 600;

    const svgImage = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#4A90E2"/>
        <text x="50%" y="50%" font-family="Arial" font-size="72" fill="white" text-anchor="middle" dy=".3em">
          FOTO TEST
        </text>
        <text x="50%" y="65%" font-family="Arial" font-size="36" fill="white" text-anchor="middle" dy=".3em">
          ${new Date().toLocaleTimeString()}
        </text>
      </svg>
    `;

    const outputPath = path.join(__dirname, '..', 'test-photo.jpg');

    await sharp(Buffer.from(svgImage)).jpeg().toFile(outputPath);

    console.log('✅ Imagen de prueba creada:', outputPath);
    console.log('Tamaño:', fs.statSync(outputPath).size, 'bytes');

    // Ahora subir la imagen usando un comando curl
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const curlCommand = `curl -X POST http://localhost:3000/api/admin/photos/simple-upload \
      -H "User-Agent: Mozilla/5.0" \
      -F "files=@${outputPath}" \
      -F "event_id=5237bf7b-6fd4-4823-bade-4736dfb9c716"`;

    console.log('Ejecutando:', curlCommand);

    const { stdout, stderr } = await execPromise(curlCommand);
    const result = JSON.parse(stdout);

    if (result.success) {
      console.log('✅ Foto subida exitosamente:', result);
    } else {
      console.error('❌ Error al subir:', result);
      if (stderr) console.error('Stderr:', stderr);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestImage();
