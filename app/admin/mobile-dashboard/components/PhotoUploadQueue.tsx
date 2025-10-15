'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Clock,
  Wifi,
  WifiOff,
  RotateCcw,
  Eye,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';

interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';
  eventId?: string;
  retryCount: number;
  error?: string;
  uploadedAt?: Date;
}

interface PhotoUploadQueueProps {
  onUploadComplete?: (item: UploadQueueItem) => void;
  onUploadError?: (item: UploadQueueItem, error: string) => void;
  eventId?: string;
  className?: string;
}

export function PhotoUploadQueue({
  onUploadComplete,
  onUploadError,
  eventId,
  className,
}: PhotoUploadQueueProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(eventId || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Process queue when online
  useEffect(() => {
    if (isOnline && queue.some(item => item.status === 'pending')) {
      processQueue();
    }
  }, [isOnline, queue]);

  const createPreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const addToQueue = useCallback(async (files: File[]) => {
    const newItems: UploadQueueItem[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const preview = await createPreview(file);
      const item: UploadQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        progress: 0,
        status: isOnline ? 'pending' : 'paused',
        eventId: selectedEventId,
        retryCount: 0,
      };

      newItems.push(item);
    }

    setQueue(prev => [...prev, ...newItems]);

    // Auto-process if online
    if (isOnline) {
      setTimeout(() => processQueue(), 100);
    }
  }, [isOnline, selectedEventId, createPreview]);

  const processQueue = useCallback(async () => {
    const pendingItems = queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      await uploadFile(item);
    }
  }, [queue]);

  const uploadFile = async (item: UploadQueueItem) => {
    setQueue(prev =>
      prev.map(q => q.id === item.id ? { ...q, status: 'uploading' as const } : q)
    );

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setQueue(prev =>
          prev.map(q =>
            q.id === item.id && q.status === 'uploading'
              ? { ...q, progress: Math.min(q.progress + Math.random() * 15, 90) }
              : q
          )
        );
      }, 200);

      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.1) { // 90% success rate
            resolve(true);
          } else {
            reject(new Error('Upload failed'));
          }
        }, 2000 + Math.random() * 2000);
      });

      clearInterval(progressInterval);

      setQueue(prev =>
        prev.map(q =>
          q.id === item.id
            ? {
                ...q,
                progress: 100,
                status: 'completed' as const,
                uploadedAt: new Date()
              }
            : q
        )
      );

      onUploadComplete?.(item);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setQueue(prev =>
        prev.map(q =>
          q.id === item.id
            ? {
                ...q,
                status: 'failed' as const,
                error: errorMessage,
                retryCount: q.retryCount + 1
              }
            : q
        )
      );

      onUploadError?.(item, errorMessage);
    }
  };

  const retryUpload = (itemId: string) => {
    setQueue(prev =>
      prev.map(q =>
        q.id === itemId
          ? { ...q, status: 'pending' as const, error: undefined, progress: 0 }
          : q
      )
    );
  };

  const removeFromQueue = (itemId: string) => {
    setQueue(prev => prev.filter(q => q.id !== itemId));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(q => q.status !== 'completed'));
  };

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    addToQueue(files);
  }, [addToQueue]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addToQueue(files);
    e.target.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Auto-retry failed uploads
  useEffect(() => {
    const retryInterval = setInterval(() => {
      const failedItems = queue.filter(item => item.status === 'failed' && item.retryCount < 3);
      if (failedItems.length > 0 && isOnline) {
        failedItems.forEach(item => {
          setTimeout(() => retryUpload(item.id), Math.random() * 2000);
        });
      }
    }, 10000);

    return () => clearInterval(retryInterval);
  }, [queue, isOnline]);

  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const uploadingCount = queue.filter(item => item.status === 'uploading').length;
  const completedCount = queue.filter(item => item.status === 'completed').length;
  const failedCount = queue.filter(item => item.status === 'failed').length;

  return (
    <div className={clsx('w-full space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200',
          'mobile-touch-target min-h-[120px]',
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          'flex flex-col items-center justify-center p-6 text-center'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isDragOver ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center space-y-2"
            >
              <div className="rounded-full bg-primary-100 p-4">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <p className="text-sm font-medium text-primary-700">
                Suelta las fotos aquí
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center space-y-2"
            >
              <div className="rounded-full bg-muted p-4">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Arrastra fotos aquí o
                </p>
                <button
                  onClick={openFileDialog}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  selecciona archivos
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Queue Status */}
      {(queue.length > 0 || uploadingCount > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Cola de Subida
            </h3>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Pendientes: {pendingCount}</span>
              <span>Subiendo: {uploadingCount}</span>
              <span>Completados: {completedCount}</span>
              {failedCount > 0 && <span className="text-red-500">Fallidos: {failedCount}</span>}
            </div>
          </div>

          {/* Queue Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <AnimatePresence>
              {queue.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={clsx(
                    'flex items-center space-x-3 rounded-xl p-3 shadow-sm ring-1',
                    item.status === 'completed'
                      ? 'bg-green-50 ring-green-200'
                      : item.status === 'failed'
                      ? 'bg-red-50 ring-red-200'
                      : 'bg-background ring-border'
                  )}
                >
                  {/* Preview */}
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <img
                      src={item.preview}
                      alt="Preview"
                      className="h-full w-full rounded-lg object-cover"
                    />
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-border/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>

                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {item.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {item.status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {item.status === 'pending' && (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex space-x-1">
                    {item.status === 'failed' && item.retryCount < 3 && (
                      <button
                        onClick={() => retryUpload(item.id)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Reintentar subida"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      aria-label="Eliminar de la cola"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Clear Completed Button */}
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="w-full py-2 px-4 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-muted-foreground transition-colors"
            >
              Limpiar completados ({completedCount})
            </button>
          )}
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && queue.some(item => item.status === 'pending') && (
        <div className="rounded-lg bg-yellow-50 p-3 ring-1 ring-yellow-200">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Subidas en espera
              </p>
              <p className="text-xs text-yellow-700">
                Se subirán automáticamente cuando haya conexión
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
