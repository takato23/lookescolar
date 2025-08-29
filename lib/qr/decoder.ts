import sharp from 'sharp';
import * as exifr from 'exifr';

type QRResult = { text: string } | null;

export function normalizeCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim().toUpperCase();
  // Normalización simple V1: quitar espacios
  const normalized = raw.replace(/\s+/g, '');
  return normalized.length > 0 ? normalized : null;
}

export async function extractEXIFDate(buffer: Buffer): Promise<Date | null> {
  try {
    const data = await exifr.parse(buffer, {
      tiff: true,
      ifd0: true,
      exif: true,
    });
    const dt =
      (data as any)?.DateTimeOriginal || (data as any)?.CreateDate || null;
    if (!dt) return null;
    const date = dt instanceof Date ? dt : new Date(dt);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export async function decodeQR(buffer: Buffer): Promise<QRResult> {
  try {
    // ZXing WASM inicialización diferida para evitar costo de import en RSC
    const {
      BrowserMultiFormatReader,
      RGBLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
    } = await import('zxing-wasm');

    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    if (!width || !height) return null;

    // Obtener datos crudos en RGBA y convertir a luminancia
    const raw = await image
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const rgba = raw.data as Buffer;
    const luminance = new Uint8ClampedArray(width * height);

    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      luminance[j] = Math.round((r * 299 + g * 587 + b * 114) / 1000);
    }

    // Create RGBLuminanceSource with proper error handling
    let source;
    try {
      source = new RGBLuminanceSource(luminance, width, height);
    } catch (constructorError) {
      console.warn('RGBLuminanceSource constructor failed:', constructorError);
      return null;
    }

    const bitmap = new BinaryBitmap(new HybridBinarizer(source));

    try {
      const reader = new BrowserMultiFormatReader();
      const result = reader.decode(bitmap);
      const text =
        typeof result?.getText === 'function' ? result.getText() : null;
      if (!text) return null;
      return { text };
    } catch (decodeError) {
      // QR not found or decode error - this is normal
      return null;
    }
  } catch (error) {
    console.warn(
      'QR detection failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
