'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  ScanLine,
  FileImage,
  Zap,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsQR from 'jsqr';

// Types
interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentScanned: (student: StudentInfo) => void;
  className?: string;
}

interface StudentInfo {
  id: string;
  name: string;
  code: string;
  event_id?: string;
}

// Visual states for the scanner
type ScannerState = 'idle' | 'scanning' | 'detected' | 'success' | 'error' | 'processing';

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onStudentScanned,
  className
}) => {
  // State management
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [scannedStudent, setScannedStudent] = useState<StudentInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout>();

  // Constants
  const SCAN_DEBOUNCE_MS = 1500; // Prevent rapid scanning
  const SCAN_INTERVAL_MS = 200; // Check for QR every 200ms

  // Camera initialization
  const initializeCamera = useCallback(async () => {
    try {
      setScannerState('processing');
      setErrorMessage('');

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Request camera access with better error handling
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera for QR scanning
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }).catch((err) => {
        // Handle permission errors gracefully
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Acceso a cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró una cámara en este dispositivo.');
        } else {
          setError('Error al acceder a la cámara. Intenta usar la opción de subir archivo.');
        }
        throw err;
      });

      setStream(mediaStream);
      setHasCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setScannerState('scanning');
        startScanning();
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setHasCamera(false);
      setScannerState('error');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Acceso a cámara denegado. Permite el acceso en la configuración del navegador.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No se encontró cámara. Puedes subir una imagen del QR.');
        } else {
          setErrorMessage('Cámara no disponible. Puedes subir una imagen como alternativa.');
        }
      }
    }
  }, []);

  // Start scanning process
  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    scanIntervalRef.current = setInterval(() => {
      scanQRCode();
    }, SCAN_INTERVAL_MS);
  }, []);

  // Stop scanning process
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = undefined;
    }
  }, []);

  // QR Code scanning logic
  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        // Debounce to prevent rapid scanning
        const now = Date.now();
        if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
          return;
        }
        setLastScanTime(now);

        handleQRDetected(code.data);
      }
    } catch (error) {
      console.error('QR scanning error:', error);
    }
  }, [lastScanTime]);

  // Handle QR code detection
  const handleQRDetected = useCallback(async (qrData: string) => {
    setScannerState('detected');
    stopScanning();
    setIsProcessing(true);

    try {
      // Parse QR data - expecting format like "STUDENT:12345:JUAN_PEREZ"
      const student = await parseQRData(qrData);
      
      if (student) {
        setScannedStudent(student);
        setScannerState('success');
        
        // Visual feedback
        toast.success(`Estudiante detectado: ${student.name}`);
        
        // Call parent callback after brief delay for UX
        setTimeout(() => {
          onStudentScanned(student);
        }, 800);
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      console.error('QR parsing error:', error);
      setScannerState('error');
      setErrorMessage('QR code no válido. Intenta con otro código.');
      
      // Reset to scanning after error
      setTimeout(() => {
        setScannerState('scanning');
        startScanning();
        setErrorMessage('');
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [onStudentScanned, stopScanning]);

  // Parse QR data into student info
  const parseQRData = useCallback(async (qrData: string): Promise<StudentInfo | null> => {
    try {
      // Try to parse as student QR format: "STUDENT:ID:NAME:EVENT_ID?"
      const parts = qrData.split(':');
      if (parts.length >= 3 && parts[0] === 'STUDENT') {
        const studentId = parts[1];
        const studentName = parts[2].replace(/_/g, ' ');
        const eventId = parts[3] || undefined;

        return {
          id: studentId,
          name: studentName,
          code: qrData,
          event_id: eventId
        };
      }

      // Alternative format: Just the token/ID
      if (qrData.length >= 10) {
        // Try to fetch student info from API
        try {
          const response = await fetch(`/api/admin/students/by-token?token=${encodeURIComponent(qrData)}`);
          if (response.ok) {
            const studentData = await response.json();
            return {
              id: studentData.id,
              name: studentData.name,
              code: qrData,
              event_id: studentData.event_id
            };
          }
        } catch (apiError) {
          console.warn('Failed to fetch student data:', apiError);
        }
      }

      // Fallback: try to extract student ID from various formats
      const studentIdMatch = qrData.match(/\d+/);
      if (studentIdMatch) {
        return {
          id: studentIdMatch[0],
          name: `Estudiante ${studentIdMatch[0]}`,
          code: qrData
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScannerState('processing');
    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      // Create image element
      const img = new Image();
      img.onload = async () => {
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        context.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            await handleQRDetected(code.data);
          } else {
            throw new Error('No QR code found in image');
          }
        } catch (error) {
          console.error('File QR scanning error:', error);
          setScannerState('error');
          setErrorMessage('No se pudo detectar un código QR en la imagen.');
          setTimeout(() => {
            setScannerState('idle');
            setErrorMessage('');
          }, 3000);
        }
      };

      img.onerror = () => {
        setScannerState('error');
        setErrorMessage('Error al cargar la imagen.');
        setTimeout(() => {
          setScannerState('idle');
          setErrorMessage('');
        }, 3000);
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      setScannerState('error');
      setErrorMessage('Error al procesar el archivo.');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [handleQRDetected]);

  // Restart scanning
  const restartScanning = useCallback(() => {
    setScannedStudent(null);
    setErrorMessage('');
    setScannerState('scanning');
    startScanning();
  }, [startScanning]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setScannerState('idle');
      setScannedStudent(null);
      setErrorMessage('');
    }
  }, [isOpen, stream, stopScanning]);

  // Auto-initialize camera when opened
  useEffect(() => {
    if (isOpen && scannerState === 'idle') {
      initializeCamera();
    }
  }, [isOpen, scannerState, initializeCamera]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            "bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <QrCode className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Escanear Estudiante</h2>
                <p className="text-sm text-gray-500">
                  Escanea el QR para etiquetar fotos
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cerrar scanner"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Scanner Area */}
            <Card className="relative overflow-hidden bg-gray-900 border-2 border-dashed border-gray-300 rounded-xl">
              <div className="aspect-[4/3] relative">
                {/* Video Element */}
                <video
                  ref={videoRef}
                  className={cn(
                    "w-full h-full object-cover rounded-lg",
                    scannerState !== 'scanning' && "hidden"
                  )}
                  playsInline
                  muted
                  aria-label="Vista previa de la cámara para escanear QR"
                />

                {/* Canvas for QR processing (hidden) */}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Scanner Overlay */}
                {scannerState === 'scanning' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.8, 1, 0.8]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-48 h-48 border-2 border-purple-500 rounded-xl relative"
                    >
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-purple-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-purple-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-purple-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-purple-400 rounded-br-lg" />
                      
                      {/* Scan line */}
                      <motion.div
                        animate={{ y: [0, 180, 0] }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute top-2 left-2 right-2 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full"
                      />
                    </motion.div>
                  </div>
                )}

                {/* State-specific content */}
                <AnimatePresence mode="wait">
                  {scannerState === 'idle' && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                    >
                      <Camera className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">Inicializando cámara...</p>
                    </motion.div>
                  )}

                  {scannerState === 'processing' && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                    >
                      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                      <p className="text-gray-600">Procesando...</p>
                    </motion.div>
                  )}

                  {scannerState === 'detected' && (
                    <motion.div
                      key="detected"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6 }}
                        className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4"
                      >
                        <Zap className="w-8 h-8 text-purple-600" />
                      </motion.div>
                      <p className="text-gray-600">¡QR detectado!</p>
                    </motion.div>
                  )}

                  {scannerState === 'success' && scannedStudent && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-green-50 rounded-lg"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6 }}
                        className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                      >
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </motion.div>
                      <div className="space-y-2">
                        <p className="font-semibold text-green-800">¡Estudiante encontrado!</p>
                        <div className="flex items-center gap-2 text-sm justify-center">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{scannedStudent.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          ID: {scannedStudent.id}
                        </Badge>
                      </div>
                    </motion.div>
                  )}

                  {scannerState === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-red-50 rounded-lg"
                    >
                      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                      <p className="text-red-700 text-sm px-2">{errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            {/* Controls */}
            <div className="mt-6 space-y-4">
              {/* File Upload Alternative */}
              {(hasCamera === false || scannerState === 'error') && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    ¿Sin cámara? Sube una imagen del código QR
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Subir imagen de código QR"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    Subir imagen QR
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {scannerState === 'success' && (
                  <Button
                    variant="outline"
                    onClick={restartScanning}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Escanear otro
                  </Button>
                )}
                
                {(scannerState === 'error' && hasCamera) && (
                  <Button
                    variant="outline"
                    onClick={initializeCamera}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Reintentar cámara
                  </Button>
                )}

                <Button
                  variant={scannerState === 'success' ? 'default' : 'ghost'}
                  onClick={onClose}
                  className="flex-1"
                >
                  {scannerState === 'success' ? 'Continuar' : 'Cancelar'}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            {scannerState === 'scanning' && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 text-center">
                  <ScanLine className="w-4 h-4 inline mr-1" />
                  Mantén el código QR dentro del marco para escanearlo
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QRScannerModal;
export type { QRScannerModalProps, StudentInfo };