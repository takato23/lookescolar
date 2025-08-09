import sharp from 'sharp';
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';

// Generador de IDs únicos para archivos
const generateFileId = customAlphabet('1234567890abcdef', 16);

export interface ProcessedImage {
  buffer: Buffer;
  format: 'webp';
  width: number;
  height: number;
  size: number;
  filename: string;
}

export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  position?:
    | 'center'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'top-left';
}

const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  text: '© LookEscolar - MUESTRA',
  opacity: 0.4,
  fontSize: 48,
  position: 'center',
};

/**
 * Procesa una imagen aplicando watermark y optimización
 * Cumple con requisitos de CLAUDE.md:
 * - Max 1600px en lado largo
 * - Formato WebP con calidad 72
 * - Watermark configurable
 * - Limpieza de metadatos EXIF
 * - Validación de seguridad
 */
export async function processImageWithWatermark(
  inputBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<ProcessedImage> {
  const config = { ...DEFAULT_WATERMARK_OPTIONS, ...options };

  // Validar seguridad de la imagen primero
  const validation = await validateImageSecurity(inputBuffer);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Imagen no válida');
  }

  const metadata = validation.metadata!;

  // Limpiar metadatos EXIF por seguridad
  const cleanBuffer = await stripImageMetadata(inputBuffer);

  // Calcular nuevas dimensiones (max 1600px en lado largo)
  let newWidth = metadata.width;
  let newHeight = metadata.height;
  const maxDimension = 1600;

  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    if (metadata.width > metadata.height) {
      newWidth = maxDimension;
      newHeight = Math.round((metadata.height / metadata.width) * maxDimension);
    } else {
      newHeight = maxDimension;
      newWidth = Math.round((metadata.width / metadata.height) * maxDimension);
    }
  }

  // Crear el SVG del watermark
  const watermarkSvg = createWatermarkSvg(
    newWidth,
    newHeight,
    config.text!,
    config.fontSize!,
    config.opacity!,
    config.position!
  );

  // Procesar la imagen (usar buffer limpio sin EXIF)
  const processedBuffer = await sharp(cleanBuffer)
    .resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        gravity: 'center',
      },
    ])
    .webp({ quality: 72 })
    .toBuffer();

  const filename = `${generateFileId()}.webp`;

  return {
    buffer: processedBuffer,
    format: 'webp',
    width: newWidth,
    height: newHeight,
    size: processedBuffer.length,
    filename,
  };
}

/**
 * Crea un SVG con el texto del watermark
 */
function createWatermarkSvg(
  width: number,
  height: number,
  text: string,
  fontSize: number,
  opacity: number,
  position: string
): string {
  // Calcular posición basada en la configuración
  let x = width / 2;
  let y = height / 2;
  let textAnchor = 'middle';
  let dominantBaseline = 'middle';

  switch (position) {
    case 'bottom-right':
      x = width - 20;
      y = height - 20;
      textAnchor = 'end';
      dominantBaseline = 'auto';
      break;
    case 'bottom-left':
      x = 20;
      y = height - 20;
      textAnchor = 'start';
      dominantBaseline = 'auto';
      break;
    case 'top-right':
      x = width - 20;
      y = 20 + fontSize;
      textAnchor = 'end';
      dominantBaseline = 'auto';
      break;
    case 'top-left':
      x = 20;
      y = 20 + fontSize;
      textAnchor = 'start';
      dominantBaseline = 'auto';
      break;
    case 'center':
    default:
      // Watermark diagonal en el centro
      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="watermarkPattern" x="0" y="0" width="${width / 2}" height="${height / 2}" patternUnits="userSpaceOnUse">
              <text
                x="${width / 4}"
                y="${height / 4}"
                font-family="Arial, sans-serif"
                font-size="${fontSize}"
                font-weight="bold"
                fill="white"
                fill-opacity="${opacity}"
                text-anchor="middle"
                dominant-baseline="middle"
                transform="rotate(-45 ${width / 4} ${height / 4})"
              >${text}</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermarkPattern)" />
        </svg>
      `;
  }

  // Watermark simple en las esquinas
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${x}"
        y="${y}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        fill-opacity="${opacity}"
        text-anchor="${textAnchor}"
        dominant-baseline="${dominantBaseline}"
      >${text}</text>
    </svg>
  `;
}

/**
 * Procesa múltiples imágenes en paralelo con límite de concurrencia usando p-limit
 * Incluye detección de duplicados por hash MD5
 */
export async function processImageBatch(
  images: { buffer: Buffer; originalName: string }[],
  options: WatermarkOptions = {},
  maxConcurrency: number = 3
): Promise<{
  results: ProcessedImage[];
  errors: Array<{ originalName: string; error: string }>;
  duplicates: Array<{
    originalName: string;
    duplicateOf: string;
    hash: string;
  }>;
}> {
  // Importar p-limit dinámicamente para compatibilidad ESM
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(maxConcurrency);

  const results: ProcessedImage[] = [];
  const errors: Array<{ originalName: string; error: string }> = [];
  const duplicates: Array<{
    originalName: string;
    duplicateOf: string;
    hash: string;
  }> = [];
  const seenHashes = new Map<string, string>(); // hash -> first filename

  const promises = images.map((image) =>
    limit(async () => {
      try {
        // Calcular hash para detección de duplicados
        const hash = calculateImageHash(image.buffer);
        const existingFile = seenHashes.get(hash);

        if (existingFile) {
          duplicates.push({
            originalName: image.originalName,
            duplicateOf: existingFile,
            hash,
          });
          return {
            success: false,
            duplicate: true,
            originalName: image.originalName,
          };
        }

        // Registrar hash
        seenHashes.set(hash, image.originalName);

        const result = await processImageWithWatermark(image.buffer, options);
        results.push(result);
        return { success: true, result, originalName: image.originalName };
      } catch (error: any) {
        const errorMsg = error.message || 'Error desconocido en procesamiento';
        errors.push({ originalName: image.originalName, error: errorMsg });
        return {
          success: false,
          error: errorMsg,
          originalName: image.originalName,
        };
      }
    })
  );

  await Promise.all(promises);

  return { results, errors, duplicates };
}

/**
 * Valida si un archivo es una imagen válida
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'];
    return !!(metadata.format && validFormats.includes(metadata.format));
  } catch {
    return false;
  }
}

/**
 * Obtiene metadata de una imagen
 */
export async function getImageMetadata(buffer: Buffer) {
  return sharp(buffer).metadata();
}

/**
 * Calcula hash MD5 de un buffer para detección de duplicados
 */
export function calculateImageHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Limpia metadatos EXIF de una imagen por seguridad
 */
export async function stripImageMetadata(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate() // Auto-rotate basado en EXIF orientation
      .withMetadata(false) // Remover metadatos EXIF
      .toBuffer();
  } catch (error) {
    throw new Error(`Error cleaning EXIF data: ${error}`);
  }
}

/**
 * Valida dimensiones y formato de imagen antes del procesamiento
 */
export async function validateImageSecurity(buffer: Buffer): Promise<{
  isValid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Validar que tenga dimensiones
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'No se pudieron obtener las dimensiones',
      };
    }

    // Validar dimensiones mínimas y máximas
    if (metadata.width < 100 || metadata.height < 100) {
      return { isValid: false, error: 'Imagen muy pequeña (mín 100x100px)' };
    }

    if (metadata.width > 10000 || metadata.height > 10000) {
      return { isValid: false, error: 'Imagen muy grande (máx 10000x10000px)' };
    }

    // Validar formato
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      return { isValid: false, error: 'Formato de imagen no válido' };
    }

    // Validar que no sea un archivo corrupto
    if (metadata.density && metadata.density < 1) {
      return { isValid: false, error: 'Imagen corrupta o inválida' };
    }

    return { isValid: true, metadata };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Error validando imagen: ${error.message}`,
    };
  }
}
