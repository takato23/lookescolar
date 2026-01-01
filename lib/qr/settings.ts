export type QrSize = 'small' | 'medium' | 'large';
export type QrDetectionSensitivity = 'low' | 'medium' | 'high';

const QR_SIZE_PX: Record<QrSize, number> = {
  small: 160,
  medium: 200,
  large: 260,
};

export function resolveQrSizePx(
  size: QrSize | null | undefined,
  fallback = QR_SIZE_PX.medium
): number {
  if (!size) return fallback;
  return QR_SIZE_PX[size] ?? fallback;
}

export function buildQrDetectionOptions({
  sensitivity,
  maxWidth = 1920,
  maxHeight = 1080,
}: {
  sensitivity?: QrDetectionSensitivity | null;
  maxWidth?: number;
  maxHeight?: number;
}): {
  maxWidth: number;
  maxHeight: number;
  enhanceContrast?: boolean;
  rotateDegrees?: number[];
  scanRegions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
} {
  const base = { maxWidth, maxHeight };

  if (sensitivity === 'low') {
    return {
      ...base,
      enhanceContrast: false,
      rotateDegrees: [0],
      scanRegions: [{ x: 0, y: 0, width: 1, height: 1 }],
    };
  }

  if (sensitivity === 'high') {
    return {
      ...base,
      enhanceContrast: true,
      rotateDegrees: [0, 90, 180, 270],
      scanRegions: [
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0, width: 0.5, height: 0.5 },
        { x: 0, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      ],
    };
  }

  return {
    ...base,
    enhanceContrast: true,
  };
}
