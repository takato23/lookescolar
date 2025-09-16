/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Square,
  ScanLine,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  X,
  RotateCcw,
  Zap,
  Maximize2,
  Volume2,
  VolumeX,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, LoadingSpinner } from '@/components/ui/feedback';
import { AccessibleButton } from '@/components/ui/accessible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface EnhancedQRScannerProps {
  onScan?: (data: QRScanResult) => void;
  onSubjectFound?: (subject: StudentInfo) => void;
  className?: string;
  disabled?: boolean;
  autoConfirm?: boolean;
  scanMode?: 'single' | 'continuous' | 'batch';
  enableSound?: boolean;
  enableAnalytics?: boolean;
  showAdvancedControls?: boolean;
  eventId?: string;
}

interface QRScanResult {
  qrCode: string;
  studentData?: StudentInfo;
  confidence: number;
  timestamp: Date;
  deviceType: string;
  scanDuration: number;
}

interface StudentInfo {
  id: string;
  name: string;
  code: string;
  eventId?: string;
  courseId?: string;
}

interface ScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  avgScanTime: number;
  scanRate: number;
  deviceTypes: Record<string, number>;
}

interface AdvancedScanSettings {
  enhanceContrast: boolean;
  multipleFormats: boolean;
  confidenceThreshold: number;
  scanInterval: number;
  batchMode: boolean;
  enableOffline: boolean;
}

export function EnhancedQRScanner({
  onScan,
  onSubjectFound,
  className,
  disabled = false,
  autoConfirm = false,
  scanMode = 'continuous',
  enableSound = true,
  enableAnalytics = true,
  showAdvancedControls = false,
  eventId,
}: EnhancedQRScannerProps) {
  // Core scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Advanced features state
  const [scanStats, setScanStats] = useState<ScanStats>({
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    avgScanTime: 0,
    scanRate: 0,
    deviceTypes: {},
  });

  const [settings, setSettings] = useState<AdvancedScanSettings>({
    enhanceContrast: true,
    multipleFormats: true,
    confidenceThreshold: 0.8,
    scanInterval: 500,
    batchMode: scanMode === 'batch',
    enableOffline: false,
  });

  const [scanResults, setScanResults] = useState<QRScanResult[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    'environment'
  );
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Performance tracking
  const scanStartTime = useRef<number>(0);
  const lastScanTime = useRef<number>(0);

  /**
   * Initialize camera with enhanced options
   */
  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCamera(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      return true;
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      setHasCamera(false);

      let errorMessage = 'Failed to access camera';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your device.';
      }

      setError(errorMessage);
      return false;
    }
  }, [facingMode]);

  /**
   * Enhanced QR detection with analytics
   */
  const detectQRCode = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    scanStartTime.current = performance.now();

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply image enhancements if enabled
    if (settings.enhanceContrast) {
      context.filter = 'contrast(150%) brightness(110%)';
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Try multiple QR detection libraries if enabled
      let qrResult = null;

      // Primary detection with jsQR
      const jsQR = await import('jsqr').then((m) => m.default);
      qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (qrResult && qrResult.data) {
        const scanDuration = performance.now() - scanStartTime.current;
        await handleQRDetection(qrResult.data, scanDuration);
      }
    } catch (error) {
      console.warn('QR detection error:', error);
    }
  }, [settings.enhanceContrast]);

  /**
   * Handle QR detection with enhanced processing
   */
  const handleQRDetection = useCallback(
    async (qrData: string, scanDuration: number) => {
      // Prevent duplicate scans
      const now = Date.now();
      if (now - lastScanTime.current < settings.scanInterval) {
        return;
      }
      lastScanTime.current = now;

      setIsProcessing(true);

      try {
        // Validate QR code
        const response = await fetch('/api/qr/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrCode: qrData,
            eventId,
          }),
        });

        const validationResult = await response.json();
        const isSuccess = validationResult.success && validationResult.valid;

        // Create scan result
        const scanResult: QRScanResult = {
          qrCode: qrData,
          studentData: isSuccess ? validationResult.data : undefined,
          confidence: isSuccess ? 1.0 : 0.0,
          timestamp: new Date(),
          deviceType: getDeviceType(),
          scanDuration,
        };

        // Update statistics
        setScanStats((prev) => ({
          totalScans: prev.totalScans + 1,
          successfulScans: prev.successfulScans + (isSuccess ? 1 : 0),
          failedScans: prev.failedScans + (isSuccess ? 0 : 1),
          avgScanTime:
            (prev.avgScanTime * prev.totalScans + scanDuration) /
            (prev.totalScans + 1),
          scanRate:
            prev.totalScans / ((Date.now() - prev.totalScans * 60000) / 60000),
          deviceTypes: {
            ...prev.deviceTypes,
            [scanResult.deviceType]:
              (prev.deviceTypes[scanResult.deviceType] || 0) + 1,
          },
        }));

        // Add to results
        setScanResults((prev) => [scanResult, ...prev.slice(0, 9)]); // Keep last 10 results

        // Analytics tracking
        if (enableAnalytics) {
          await recordScanEvent(scanResult);
        }

        // Sound feedback
        if (soundEnabled) {
          playFeedbackSound(isSuccess);
        }

        // Callbacks
        if (isSuccess) {
          onScan?.(scanResult);
          onSubjectFound?.(scanResult.studentData!);

          toast.success(`Student detected: ${scanResult.studentData?.name}`, {
            duration: 3000,
          });
        } else {
          toast.error('QR code not recognized', {
            description: 'Make sure the QR code is from this event',
          });
        }

        // Stop scanning if in single mode
        if (scanMode === 'single' && isSuccess) {
          stopScanning();
        }
      } catch (error) {
        console.error('QR validation failed:', error);
        toast.error('Failed to validate QR code');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      settings.scanInterval,
      eventId,
      enableAnalytics,
      soundEnabled,
      onScan,
      onSubjectFound,
      scanMode,
    ]
  );

  /**
   * Record scan event for analytics
   */
  const recordScanEvent = async (scanResult: QRScanResult) => {
    try {
      await fetch('/api/qr/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeId: scanResult.qrCode.substring(0, 20),
          eventId,
          deviceType: scanResult.deviceType,
          scanDuration: scanResult.scanDuration,
          success: !!scanResult.studentData,
          errorMessage: scanResult.studentData
            ? undefined
            : 'QR not recognized',
        }),
      });
    } catch (error) {
      console.warn('Failed to record scan analytics:', error);
    }
  };

  /**
   * Get device type for analytics
   */
  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android'))
      return 'mobile';
    if (userAgent.includes('tablet') || userAgent.includes('ipad'))
      return 'tablet';
    return 'desktop';
  };

  /**
   * Play audio feedback
   */
  const playFeedbackSound = (success: boolean) => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = success ? 1000 : 400;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  /**
   * Start scanning
   */
  const startScanning = useCallback(async () => {
    if (disabled) return;

    const cameraReady = hasCamera || (await initializeCamera());
    if (!cameraReady) return;

    setIsScanning(true);
    setError(null);

    // Start detection loop
    const detectLoop = () => {
      if (isScanning) {
        detectQRCode();
        animationRef.current = requestAnimationFrame(detectLoop);
      }
    };

    detectLoop();
  }, [disabled, hasCamera, initializeCamera, isScanning, detectQRCode]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(() => {
    setIsScanning(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setHasCamera(null);
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      initializeCamera();
    } else {
      setHasCamera(false);
      setError('Camera not supported in this browser');
    }

    return () => {
      stopScanning();
    };
  }, []);

  // Render loading state
  if (hasCamera === null) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner label="Initializing camera..." />
        </div>
      </Card>
    );
  }

  // Render error state
  if (hasCamera === false) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Camera Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{error}</p>
          <Button onClick={initializeCamera} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-purple-600" />
            <div>
              <span className="text-lg">Enhanced QR Scanner</span>
              <div className="text-xs font-normal text-gray-500">
                {scanMode} Mode •{' '}
                {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={isScanning ? 'pending' : 'info'}>
              {isScanning ? 'Scanning...' : 'Ready'}
            </StatusBadge>

            {scanStats.totalScans > 0 && (
              <Badge variant="secondary" className="text-xs">
                {scanStats.successfulScans}/{scanStats.totalScans}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scanner Area */}
        <div className="relative">
          <video
            ref={videoRef}
            className={cn(
              'w-full rounded-lg border-2',
              isScanning ? 'border-green-400' : 'border-gray-300'
            )}
            playsInline
            muted
            style={{ display: isScanning ? 'block' : 'none' }}
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-4 rounded-lg border-2 border-green-400">
                <motion.div
                  className="absolute inset-x-0 h-0.5 bg-green-400"
                  animate={{ y: [0, '100%', 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
              <div className="rounded-lg bg-white p-4 text-center">
                <LoadingSpinner size="sm" />
                <p className="mt-2 text-sm">Processing QR code...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              disabled={disabled}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Scanner
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="danger" className="flex-1">
              <Square className="mr-2 h-4 w-4" />
              Stop Scanner
            </Button>
          )}

          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="outline"
            size="sm"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            size="sm"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Scan Results */}
        {scanResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recent Scans:</h4>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {scanResults.map((result, index) => (
                <div
                  key={`${result.qrCode}-${result.timestamp.getTime()}`}
                  className={cn(
                    'flex items-center justify-between rounded border p-2',
                    result.studentData
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {result.studentData ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {result.studentData?.name || 'Unknown QR'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.scanDuration.toFixed(0)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {enableAnalytics && scanStats.totalScans > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {scanStats.successfulScans}
              </div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {scanStats.avgScanTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-gray-500">Avg Time</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">
                {(
                  (scanStats.successfulScans / scanStats.totalScans) *
                  100
                ).toFixed(0)}
                %
              </div>
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
