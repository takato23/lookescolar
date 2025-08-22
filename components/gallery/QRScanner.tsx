'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Camera, CameraOff, RotateCcw, CheckCircle, XCircle, Scan } from 'lucide-react';

interface QRScannerProps {
  onQRDetected: (qrData: any) => void;
  eventId?: string;
  className?: string;
}

interface DetectedQR {
  qrCode: string;
  studentName?: string;
  studentId?: string;
  confidence: number;
  timestamp: number;
}

export default function QRScanner({ onQRDetected, eventId, className }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [detectedQRs, setDetectedQRs] = useState<DetectedQR[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if QR scanning is supported
  const isSupported = typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopScanning();
    };
  }, []);

  const requestCameraPermission = async () => {
    if (!isSupported) {
      setError('Camera access is not supported in this browser');
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Camera permission denied:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please check your device has a camera.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
      setHasPermission(false);
      return false;
    }
  };

  const startScanning = async () => {
    if (!stream && !(await requestCameraPermission())) {
      return;
    }

    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    await video.play();

    setIsScanning(true);
    setError(null);

    // Start QR scanning interval
    scanIntervalRef.current = setInterval(() => {
      scanForQRCode();
    }, 500); // Scan every 500ms
  };

  const stopScanning = () => {
    setIsScanning(false);

    // Stop the scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Stop the video stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Clear video element
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  };

  const scanForQRCode = async () => {
    if (!isScanning || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try to detect QR code using jsQR
      const jsQR = await import('jsqr').then(m => m.default);
      const qrCodeResult = jsQR(imageData.data, imageData.width, imageData.height);

      if (qrCodeResult && qrCodeResult.data) {
        await handleQRDetection(qrCodeResult.data);
      }
    } catch (err: any) {
      console.warn('QR scanning error:', err);
      // Don't show error for scanning failures as they're common
    }
  };

  const handleQRDetection = async (qrValue: string) => {
    // Check if we've already detected this QR recently (within 5 seconds)
    const recentDetection = detectedQRs.find(
      qr => qr.qrCode === qrValue && Date.now() - qr.timestamp < 5000
    );

    if (recentDetection) {
      return; // Skip duplicate detection
    }

    setIsProcessing(true);

    try {
      // Validate QR code with server
      const response = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCode: qrValue,
          eventId,
        }),
      });

      const data = await response.json();

      if (data.success && data.valid) {
        const detectedQR: DetectedQR = {
          qrCode: qrValue,
          studentName: data.data.studentName,
          studentId: data.data.studentId,
          confidence: 1.0, // jsQR doesn't provide confidence
          timestamp: Date.now(),
        };

        setDetectedQRs(prev => [detectedQR, ...prev.slice(0, 4)]); // Keep last 5 detections
        
        toast.success(`QR code detected: ${data.data.studentName}`);
        
        // Call the callback with the detected QR data
        onQRDetected(data.data);

        // Vibrate if available (mobile devices)
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      } else {
        toast.warning('QR code not recognized or invalid');
      }
    } catch (error) {
      console.error('QR validation error:', error);
      toast.error('Failed to validate QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearDetectedQRs = () => {
    setDetectedQRs([]);
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            QR scanning is not supported in this browser.
            Please use a modern browser with camera support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <video
              ref={videoRef}
              className={`w-full rounded-lg border ${isScanning ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {!isScanning && hasPermission !== false && (
              <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-muted-foreground">Click Start Scanning to begin</p>
                </div>
              </div>
            )}

            {isScanning && isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm">Processing QR code...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1">
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Scanning
              </Button>
            )}
            
            {detectedQRs.length > 0 && (
              <Button onClick={clearDetectedQRs} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Recent detections */}
          {detectedQRs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Recent Detections:</h4>
              <div className="space-y-1">
                {detectedQRs.map((detection, index) => (
                  <div
                    key={`${detection.qrCode}-${detection.timestamp}`}
                    className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">
                        {detection.studentName || 'Unknown Student'}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(detection.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>• Point your camera at a student's QR code</p>
            <p>• Make sure the QR code is well-lit and in focus</p>
            <p>• The scanner will automatically detect and validate QR codes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}