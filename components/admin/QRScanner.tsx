'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Square,
  ScanLine,
  AlertCircle,
  CheckCircle,
  X,
  RotateCcw,
  Zap,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, LoadingSpinner } from '@/components/ui/feedback';
import { AccessibleButton } from '@/components/ui/accessible';
import { cn } from '@/lib/utils/cn';

// Type declarations for jsQR since @types/jsqr doesn't exist
declare module 'jsqr' {
  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: Array<{
      type: string;
      text: string;
    }>;
    location: {
      topLeftCorner: { x: number; y: number };
      topRightCorner: { x: number; y: number };
      bottomRightCorner: { x: number; y: number };
      bottomLeftCorner: { x: number; y: number };
      topLeftFinderPattern: { x: number; y: number };
      topRightFinderPattern: { x: number; y: number };
      bottomLeftFinderPattern: { x: number; y: number };
    };
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?:
        | 'dontInvert'
        | 'onlyInvert'
        | 'attemptBoth'
        | 'invertFirst';
      canOverwriteImage?: boolean;
    }
  ): QRCode | null;

  export = jsQR;
}

interface QRScannerProps {
  onScan: (token: string) => void;
  className?: string;
  disabled?: boolean;
  onSubjectFound?: (subjectInfo: { id: string; name: string }) => void;
  autoConfirm?: boolean;
  scanMode?: 'continuous' | 'single';
  enableSound?: boolean;
}

interface ScanResult {
  token: string;
  timestamp: Date;
  status: 'success' | 'error' | 'duplicate' | 'invalid';
  message: string;
  subjectInfo?: {
    id: string;
    name: string;
  };
}

interface ScanStats {
  totalScans: number;
  successfulScans: number;
  duplicateScans: number;
  errorScans: number;
  scanRate: number; // scans per minute
}

export function QRScanner({
  onScan,
  className,
  disabled = false,
  onSubjectFound,
  autoConfirm = false,
  scanMode = 'continuous',
  enableSound = true,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStats, setScanStats] = useState<ScanStats>({
    totalScans: 0,
    successfulScans: 0,
    duplicateScans: 0,
    errorScans: 0,
    scanRate: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Check camera availability on mount
  useEffect(() => {
    checkCameraAvailability();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevice = devices.some(
        (device) => device.kind === 'videoinput'
      );
      setHasCamera(hasVideoDevice);
    } catch (err) {
      console.error('Error checking camera availability:', err);
      setHasCamera(false);
    }
  };

  const startScanning = async () => {
    if (disabled || isScanning) return;

    try {
      setError(null);
      setIsScanning(true);
      startTimeRef.current = Date.now();

      // Enhanced camera constraints
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;

        await videoRef.current.play();

        // Start scanning after video is ready
        videoRef.current.addEventListener('loadeddata', () => {
          startQRDetection();
        });
      }

      // Start stats updating
      statsIntervalRef.current = setInterval(() => {
        setScanStats((prev) => {
          const elapsed = (Date.now() - startTimeRef.current) / 60000; // minutes
          return {
            ...prev,
            scanRate: elapsed > 0 ? prev.totalScans / elapsed : 0,
          };
        });
      }, 5000); // Update every 5 seconds
    } catch (err: any) {
      console.error('Error starting camera:', err);
      let errorMessage = 'Error al acceder a la cámara';

      if (err.name === 'NotAllowedError') {
        errorMessage =
          'Permiso de cámara denegado. Por favor, habilita el acceso a la cámara en la configuración del navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara disponible.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo utilizada por otra aplicación.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'La cámara no soporta la configuración solicitada.';
      }

      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear intervals and animations
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  };

  // Sound effects for feedback
  const playSound = useCallback(
    (type: 'success' | 'error') => {
      if (!soundEnabled) return;

      // Create audio context for beep sounds
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          type === 'success' ? 800 : 400,
          audioContext.currentTime
        );
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (e) {
        // Audio context not supported
      }
    },
    [soundEnabled]
  );

  // Update scan statistics
  const updateScanStats = useCallback(
    (type: 'success' | 'duplicate' | 'error') => {
      setScanStats((prev) => {
        const elapsed = (Date.now() - startTimeRef.current) / 60000; // minutes
        const newTotals = {
          totalScans: prev.totalScans + 1,
          successfulScans: prev.successfulScans + (type === 'success' ? 1 : 0),
          duplicateScans: prev.duplicateScans + (type === 'duplicate' ? 1 : 0),
          errorScans: prev.errorScans + (type === 'error' ? 1 : 0),
          scanRate: elapsed > 0 ? (prev.totalScans + 1) / elapsed : 0,
        };
        return newTotals;
      });
    },
    []
  );

  // Start real-time QR detection with jsQR
  const startQRDetection = useCallback(() => {
    const detectFrame = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Set canvas size to match video
      const { videoWidth: width, videoHeight: height } = video;
      canvas.width = width;
      canvas.height = height;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Get image data for QR scanning
      const imageData = ctx.getImageData(0, 0, width, height);

      try {
        // Use jsQR to detect QR codes
        const jsQR = require('jsqr');
        const qrCode = jsQR(imageData.data, width, height, {
          inversionAttempts: 'attemptBoth',
        });

        if (qrCode) {
          handleQRDetection(qrCode.data, qrCode.location);

          // Draw QR code outline for visual feedback
          drawQROutline(ctx, qrCode.location);
        }
      } catch (error) {
        console.error('Error in QR detection:', error);
      }

      animationRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }, [isScanning]);

  // Draw QR code detection outline
  const drawQROutline = useCallback(
    (ctx: CanvasRenderingContext2D, location: any) => {
      const {
        topLeftCorner,
        topRightCorner,
        bottomRightCorner,
        bottomLeftCorner,
      } = location;

      ctx.strokeStyle = '#10B981'; // Green color
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
      ctx.lineTo(topRightCorner.x, topRightCorner.y);
      ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
      ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
      ctx.closePath();
      ctx.stroke();

      // Add corner indicators
      const cornerSize = 20;
      [
        topLeftCorner,
        topRightCorner,
        bottomRightCorner,
        bottomLeftCorner,
      ].forEach((corner) => {
        ctx.fillStyle = '#10B981';
        ctx.fillRect(corner.x - 2, corner.y - 2, 4, 4);
      });
    },
    []
  );

  // Validate token format and lookup subject
  const validateAndLookupToken = useCallback(async (token: string) => {
    try {
      const response = await fetch(
        `/api/admin/subjects/validate-token?token=${encodeURIComponent(token)}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.subject;
      }
    } catch (error) {
      console.error('Error validating token:', error);
    }
    return null;
  }, []);

  const handleQRDetection = useCallback(
    async (token: string, location?: any) => {
      // Avoid duplicate scans within short timeframe
      if (token === lastScannedToken) return;

      setLastScannedToken(token);
      updateScanStats('success');

      // Validate token format (should be 20+ characters)
      if (token.length < 20) {
        addScanResult(token, 'invalid', 'Token inválido: muy corto');
        playSound('error');
        updateScanStats('error');
        return;
      }

      // Check for duplicates in recent scans (last 10 seconds)
      const isDuplicate = scanResults.some(
        (result) =>
          result.token === token &&
          result.status === 'success' &&
          Date.now() - result.timestamp.getTime() < 10000
      );

      if (isDuplicate) {
        addScanResult(token, 'duplicate', 'Token ya escaneado recientemente');
        playSound('error');
        updateScanStats('duplicate');
        return;
      }

      // Validate token and get subject info
      const subjectInfo = await validateAndLookupToken(token);

      if (subjectInfo) {
        addScanResult(
          token,
          'success',
          `Token válido: ${subjectInfo.name}`,
          subjectInfo
        );
        playSound('success');

        // Callback with subject info if provided
        if (onSubjectFound) {
          onSubjectFound(subjectInfo);
        }

        // Auto-confirm or require manual confirmation
        if (autoConfirm) {
          onScan(token);

          // Stop scanning if in single mode
          if (scanMode === 'single') {
            stopScanning();
          }
        } else {
          onScan(token);
        }
      } else {
        addScanResult(token, 'error', 'Token no válido o no encontrado');
        playSound('error');
        updateScanStats('error');
      }

      // Clear last scanned token after delay
      setTimeout(() => {
        setLastScannedToken(null);
      }, 3000);
    },
    [
      lastScannedToken,
      scanResults,
      updateScanStats,
      playSound,
      validateAndLookupToken,
      onSubjectFound,
      autoConfirm,
      onScan,
      scanMode,
    ]
  );

  const addScanResult = (
    token: string,
    status: ScanResult['status'],
    message: string,
    subjectInfo?: { id: string; name: string }
  ) => {
    const result: ScanResult = {
      token,
      timestamp: new Date(),
      status,
      message,
      subjectInfo,
    };

    setScanResults((prev) => [result, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  // Camera switching
  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (isScanning) {
      stopScanning();
      setTimeout(() => startScanning(), 500); // Brief delay for camera switch
    }
  }, [facingMode, isScanning]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Manual token input as fallback
  const handleManualInput = () => {
    const token = prompt('Ingresa el token manualmente:');
    if (token && token.trim()) {
      handleQRDetection(token.trim());
    }
  };

  if (hasCamera === null) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner label="Verificando cámara..." />
        </div>
      </Card>
    );
  }

  if (hasCamera === false) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Cámara no disponible
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            No se pudo acceder a la cámara. Puedes ingresar tokens manualmente.
          </p>
          <AccessibleButton
            onClick={handleManualInput}
            variant="primary"
            ariaLabel="Ingresar token manualmente"
          >
            Ingresar Token Manualmente
          </AccessibleButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-lg">Escáner QR Avanzado</span>
              <div className="text-xs font-normal text-gray-500">
                {scanMode === 'continuous' ? 'Modo Continuo' : 'Escaneo Único'}{' '}
                •
                {facingMode === 'environment'
                  ? ' Cámara Trasera'
                  : ' Cámara Frontal'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={isScanning ? 'pending' : 'info'}>
              {isScanning ? 'Escaneando...' : 'Inactivo'}
            </StatusBadge>

            {/* Scanner Stats Badge */}
            {scanStats.totalScans > 0 && (
              <div className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                {scanStats.successfulScans}/{scanStats.totalScans}
                {scanStats.scanRate > 0 &&
                  ` • ${scanStats.scanRate.toFixed(1)}/min`}
              </div>
            )}
          </div>
        </CardTitle>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {isScanning && (
              <>
                <AccessibleButton
                  onClick={switchCamera}
                  variant="outline"
                  size="sm"
                  ariaLabel="Cambiar cámara"
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </AccessibleButton>

                <AccessibleButton
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  ariaLabel={
                    isFullscreen
                      ? 'Salir de pantalla completa'
                      : 'Pantalla completa'
                  }
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </AccessibleButton>

                <AccessibleButton
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  variant="outline"
                  size="sm"
                  ariaLabel={
                    soundEnabled ? 'Desactivar sonido' : 'Activar sonido'
                  }
                  className="h-8 w-8 p-0"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3 w-3" />
                  ) : (
                    <VolumeX className="h-3 w-3" />
                  )}
                </AccessibleButton>
              </>
            )}
          </div>

          {isFullscreen && (
            <AccessibleButton
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              ariaLabel="Cerrar pantalla completa"
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </AccessibleButton>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Enhanced Video Preview */}
        <div
          className={cn(
            'relative overflow-hidden rounded-lg bg-black transition-all duration-300',
            isFullscreen ? 'aspect-auto h-[60vh]' : 'aspect-video'
          )}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* Enhanced scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Dynamic scanning frame */}
                <div className="relative h-72 w-72 rounded-xl border-2 border-white/30 transition-all duration-500">
                  {/* Corner indicators */}
                  <div className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-xl border-l-4 border-t-4 border-green-400 transition-colors duration-300" />
                  <div className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-xl border-r-4 border-t-4 border-green-400 transition-colors duration-300" />
                  <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-xl border-b-4 border-l-4 border-green-400 transition-colors duration-300" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-xl border-b-4 border-r-4 border-green-400 transition-colors duration-300" />

                  {/* Enhanced scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    <div className="scanning-line animate-scan absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-80" />
                  </div>

                  {/* Center crosshair */}
                  <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
                    <div className="mx-auto h-full w-0.5 bg-green-400"></div>
                    <div className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-green-400"></div>
                  </div>
                </div>

                <div className="mt-6 space-y-2 text-center">
                  <p className="text-sm font-medium text-white">
                    Posiciona el código QR dentro del marco
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-white/70">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Auto-detección
                    </div>
                    <div className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Alta resolución
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900/50 to-gray-900/80 backdrop-blur-sm">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <Square className="h-10 w-10 text-white" />
                </div>
                <div>
                  <p className="mb-1 font-medium text-white">
                    Escáner QR Listo
                  </p>
                  <p className="text-sm text-white/70">
                    Presiona Iniciar para comenzar a escanear
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Performance indicator */}
          {isScanning && scanStats.scanRate > 0 && (
            <div className="absolute right-4 top-4 rounded-lg bg-black/50 px-3 py-1 backdrop-blur-sm">
              <div className="text-xs text-white/90">
                {scanStats.scanRate.toFixed(1)} escaneos/min
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <AccessibleButton
              onClick={startScanning}
              disabled={disabled}
              variant="primary"
              className="flex-1"
              ariaLabel="Iniciar escáner QR"
            >
              <Camera className="mr-2 h-4 w-4" />
              Iniciar Escáner
            </AccessibleButton>
          ) : (
            <AccessibleButton
              onClick={stopScanning}
              variant="secondary"
              className="flex-1"
              ariaLabel="Detener escáner QR"
            >
              <Square className="mr-2 h-4 w-4" />
              Detener Escáner
            </AccessibleButton>
          )}

          <AccessibleButton
            onClick={handleManualInput}
            variant="outline"
            ariaLabel="Ingresar token manualmente como alternativa al escáner"
          >
            Ingresar Manualmente
          </AccessibleButton>
        </div>

        {/* Enhanced Scan Results */}
        {scanResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ScanLine className="h-4 w-4" />
                Historial de Escaneos ({scanResults.length})
              </h4>
              <AccessibleButton
                onClick={() => setScanResults([])}
                variant="outline"
                size="sm"
                ariaLabel="Limpiar historial"
                className="h-6 px-2 text-xs"
              >
                Limpiar
              </AccessibleButton>
            </div>

            <div
              className={cn(
                'scrollbar-thin scrollbar-thumb-gray-300 space-y-2 overflow-y-auto',
                isFullscreen ? 'max-h-48' : 'max-h-40'
              )}
            >
              {scanResults.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-lg border p-3 transition-all duration-200 hover:shadow-sm',
                    result.status === 'success' &&
                      'border-green-200 bg-green-50 text-green-800',
                    result.status === 'error' &&
                      'border-red-200 bg-red-50 text-red-800',
                    result.status === 'duplicate' &&
                      'border-yellow-200 bg-yellow-50 text-yellow-800',
                    result.status === 'invalid' &&
                      'border-gray-200 bg-gray-50 text-gray-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {result.status === 'success' && (
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                        )}
                        {(result.status === 'error' ||
                          result.status === 'invalid') && (
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-600" />
                        )}
                        {result.status === 'duplicate' && (
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-yellow-600" />
                        )}
                        <span className="truncate text-xs font-medium">
                          {result.subjectInfo?.name || 'Token escaneado'}
                        </span>
                      </div>

                      <div className="mb-1 truncate font-mono text-xs text-gray-600">
                        {result.token.slice(0, 12)}...{result.token.slice(-12)}
                      </div>

                      <div className="text-xs opacity-80">{result.message}</div>
                    </div>

                    <div className="flex flex-col items-end text-xs text-gray-500">
                      <span>
                        {result.timestamp.toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      {result.subjectInfo && (
                        <span className="mt-0.5 text-xs font-medium text-purple-600">
                          ID: {result.subjectInfo.id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick stats summary */}
            <div className="grid grid-cols-4 gap-2 border-t pt-2">
              <div className="text-center">
                <div className="text-sm font-semibold text-green-600">
                  {scanStats.successfulScans}
                </div>
                <div className="text-xs text-gray-500">Exitosos</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-yellow-600">
                  {scanStats.duplicateScans}
                </div>
                <div className="text-xs text-gray-500">Duplicados</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-red-600">
                  {scanStats.errorScans}
                </div>
                <div className="text-xs text-gray-500">Errores</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-600">
                  {scanStats.scanRate > 0 ? scanStats.scanRate.toFixed(1) : '0'}
                </div>
                <div className="text-xs text-gray-500">Por min</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(350px);
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }

        .scrollbar-thin {
          scrollbar-width: thin;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
      `}</style>
    </Card>
  );
}
