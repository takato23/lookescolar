import sharp from 'sharp';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { signedUrlForKey } from '@/lib/storage/signedUrl';
const ORIGINAL_BUCKET = process.env['STORAGE_BUCKET_ORIGINAL'] || process.env['STORAGE_BUCKET'] || 'photo-private';
const PREVIEW_BUCKET = process.env['STORAGE_BUCKET_PREVIEW'] || 'photos';

interface ProcessImageResult {
  success: boolean;
  data?: {
    storage_path: string;
    preview_path: string;
    width: number;
    height: number;
  };
  error?: string;
}

export async function processAndUploadImage(
  buffer: Buffer,
  originalFilename: string,
  eventId?: string | null
): Promise<ProcessImageResult> {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Generar nombres únicos para los archivos
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileExtension = originalFilename.split('.').pop() || 'jpg';

    // Paths para storage
    const basePath = eventId ? `events/${eventId}` : 'unassigned';
    const originalPath = `${basePath}/originals/${timestamp}_${randomId}.${fileExtension}`;
    const previewPath = `${basePath}/previews/${timestamp}_${randomId}_preview.webp`;

    // Obtener metadata de la imagen original
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Crear preview con watermark más prominente para tienda online
    const watermarkText = 'LOOK ESCOLAR';
    const fontSize = Math.max(40, Math.floor(Math.min(width, height) / 15)); // Texto más grande

    // Crear SVG para el watermark con mayor densidad y visibilidad
    const patternSize = 250; // Patrón más pequeño = más repeticiones
    const watermarkSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="watermark" x="0" y="0" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
            <text x="${patternSize/2}" y="${patternSize/2}" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              font-weight="bold"
              fill="white" 
              fill-opacity="0.4" 
              text-anchor="middle"
              transform="rotate(-45 ${patternSize/2} ${patternSize/2})">
              ${watermarkText}
            </text>
            <!-- Agregar texto adicional para mayor protección -->
            <text x="${patternSize/2}" y="${patternSize/2 + fontSize + 10}" 
              font-family="Arial, sans-serif" 
              font-size="${Math.floor(fontSize * 0.7)}" 
              font-weight="normal"
              fill="white" 
              fill-opacity="0.3" 
              text-anchor="middle"
              transform="rotate(-45 ${patternSize/2} ${patternSize/2 + fontSize + 10})">
              VISTA PREVIA
            </text>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#watermark)" />
      </svg>
    `);

    // Procesar imagen: redimensionar y agregar watermark
    const processedImage = await sharp(buffer)
      .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .composite([
        {
          input: watermarkSvg,
          blend: 'over',
        },
      ])
      .webp({ quality: 85 })
      .toBuffer();

    // Subir imagen original (sin watermark) al bucket privado
    const { error: originalError } = await supabase.storage
      .from(ORIGINAL_BUCKET)
      .upload(originalPath, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (originalError) {
      throw new Error(`Error subiendo original: ${originalError.message}`);
    }

    // Subir preview con watermark (público)
    const { error: previewError } = await supabase.storage
      .from(PREVIEW_BUCKET)
      .upload(previewPath, processedImage, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (previewError) {
      // Si falla el preview, eliminar el original
      await supabase.storage.from(ORIGINAL_BUCKET).remove([originalPath]);
      throw new Error(`Error subiendo preview: ${previewError.message}`);
    }

    console.log('Imagen procesada y subida exitosamente', {
      originalPath,
      previewPath,
      width,
      height,
      originalSize: buffer.length,
      previewSize: processedImage.length,
    });

    return {
      success: true,
      data: {
        storage_path: originalPath,
        preview_path: previewPath,
        width,
        height,
      },
    };
  } catch (error) {
    console.error('Error procesando imagen', {
      filename: originalFilename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Función para generar URL firmada temporal
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Delegar al helper centralizado que determina el bucket por el path
    const url = await signedUrlForKey(path, expiresIn);
    return url;
  } catch (error) {
    console.error('Error en getSignedUrl', { path, error });
    return null;
  }
}
