/**
 * Multi-Resolution WebP Generation Service
 * Generates 300px, 800px, 1200px versions of uploaded images with watermarks
 */

// Dynamic import for Sharp
let sharp: any;

async function getSharp() {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      console.error('Failed to load Sharp:', error);
      throw new Error('Image processing unavailable');
    }
  }
  return sharp;
}

interface MultiResolutionResult {
  thumbnail: { buffer: Buffer; path: string };
  preview: { buffer: Buffer; path: string };
  watermark: { buffer: Buffer; path: string };
  thumbnailSize: number;
  previewSize: number;
  watermarkSize: number;
  totalOptimizedSize: number;
}

export class MultiResolutionWebPService {
  /**
   * Generate 300px thumbnail, 800px preview, 1200px watermark versions
   */
  static async generateWebPVersions(
    inputBuffer: Buffer,
    basePath: string,
    watermarkText: string = 'LOOK ESCOLAR'
  ): Promise<MultiResolutionResult> {
    const sharpInstance = await getSharp();

    // Get original image metadata
    const metadata = await sharpInstance(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    // Generate 300px thumbnail (60% quality, aggressive compression)
    const thumbnail = await sharpInstance(inputBuffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 60 })
      .toBuffer();

    // Generate 800px preview (75% quality)
    const preview = await sharpInstance(inputBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    // Generate 1200px watermark version (80% quality + watermark)
    const watermark = await sharpInstance(inputBuffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .composite([
        {
          input: await sharpInstance({
            text: {
              text: watermarkText,
              font: 'Helvetica',
              fontSize: 48,
              align: 'center',
            },
          })
            .svg()
            .png()
            .toBuffer(),
          gravity: 'center',
          blend: 'over',
        },
      ])
      .webp({ quality: 80 })
      .toBuffer();

    const thumbnailSize = thumbnail.length;
    const previewSize = preview.length;
    const watermarkSize = watermark.length;
    const totalOptimizedSize = thumbnailSize + previewSize + watermarkSize;

    return {
      thumbnail: {
        buffer: thumbnail,
        path: `${basePath}/thumb_300.webp`,
      },
      preview: {
        buffer: preview,
        path: `${basePath}/preview_800.webp`,
      },
      watermark: {
        buffer: watermark,
        path: `${basePath}/watermark_1200.webp`,
      },
      thumbnailSize,
      previewSize,
      watermarkSize,
      totalOptimizedSize,
    };
  }

  /**
   * Generate only specific sizes (for legacy compatibility)
   */
  static async generateSpecificSizes(
    inputBuffer: Buffer,
    sizes: Array<{ width: number; quality: number; hasWatermark?: boolean }>,
    watermarkText?: string
  ): Promise<Array<{ buffer: Buffer; width: number; size: number }>> {
    const sharpInstance = await getSharp();
    const results = [];

    for (const size of sizes) {
      let image = sharpInstance(inputBuffer).resize(size.width, size.width, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Add watermark if requested
      if (size.hasWatermark && watermarkText) {
        image = image.composite([
          {
            input: await sharpInstance({
              text: {
                text: watermarkText,
                font: 'Helvetica',
                fontSize: Math.round(size.width * 0.04), // 4% of width
                align: 'center',
              },
            })
              .svg()
              .png()
              .toBuffer(),
            gravity: 'center',
            blend: 'over',
          },
        ]);
      }

      const buffer = await image.webp({ quality: size.quality }).toBuffer();

      results.push({
        buffer,
        width: size.width,
        size: buffer.length,
      });
    }

    return results;
  }

  /**
   * Get storage paths for all versions
   */
  static getStoragePaths(assetId: string): {
    thumbnail: string;
    preview: string;
    watermark: string;
  } {
    return {
      thumbnail: `thumbnails/${assetId}/thumb_300.webp`,
      preview: `previews/${assetId}/preview_800.webp`,
      watermark: `watermarks/${assetId}/watermark_1200.webp`,
    };
  }
}

