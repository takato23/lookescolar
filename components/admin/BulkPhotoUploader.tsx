'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
  FolderOpen,
  Image as ImageIcon,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Info,
  Zap,
  HardDrive,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BulkUploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'paused';
  progress: number;
  error?: string;
  photoId?: string;
  folderId?: string | null;
  optimizationInfo?: {
    originalSizeKB: number;
    optimizedSizeKB: number;
    compressionRatio: number;
  };
  uploadStartTime?: number;
  uploadEndTime?: number;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  depth: number;
}

interface UploadStats {
  total: number;
  completed: number;
  failed: number;
  totalSizeKB: number;
  optimizedSizeKB: number;
  avgCompressionRatio: number;
  avgUploadTimeMs: number;
  estimatedTimeRemaining: number;
}

interface BulkPhotoUploaderProps {
  eventId: string;
  eventName?: string;
  defaultFolderId?: string | null;
  folders: Folder[];
  onUploadComplete: (results: { succeeded: string[]; failed: any[] }) => void;
  onClose?: () => void;
  maxConcurrentUploads?: number;
  className?: string;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_CONCURRENT = 3; // Conservative for free tier
const CHUNK_SIZE = 50; // Process in chunks of 50 files

export function BulkPhotoUploader({
  eventId,
  eventName,
  defaultFolderId,
  folders,
  onUploadComplete,
  onClose,
  maxConcurrentUploads = DEFAULT_MAX_CONCURRENT,
  className
}: BulkPhotoUploaderProps) {
  const [files, setFiles] = useState<BulkUploadFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolderId || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentlyUploading, setCurrentlyUploading] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<UploadStats>({
    total: 0,
    completed: 0,
    failed: 0,
    totalSizeKB: 0,
    optimizedSizeKB: 0,
    avgCompressionRatio: 0,
    avgUploadTimeMs: 0,
    estimatedTimeRemaining: 0
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<BulkUploadFile[]>([]);
  const isProcessingRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Update stats whenever files change
  useEffect(() => {
    const newStats = calculateStats(files);
    setStats(newStats);
  }, [files]);

  const calculateStats = (fileList: BulkUploadFile[]): UploadStats => {
    const total = fileList.length;
    const completed = fileList.filter(f => f.status === 'completed').length;
    const failed = fileList.filter(f => f.status === 'error').length;
    
    const totalSizeKB = fileList.reduce((sum, f) => sum + Math.round(f.file.size / 1024), 0);
    
    const completedFiles = fileList.filter(f => f.status === 'completed' && f.optimizationInfo);
    const optimizedSizeKB = completedFiles.reduce(
      (sum, f) => sum + (f.optimizationInfo?.optimizedSizeKB || 0), 
      0
    );
    
    const avgCompressionRatio = completedFiles.length > 0 
      ? completedFiles.reduce((sum, f) => sum + (f.optimizationInfo?.compressionRatio || 0), 0) / completedFiles.length
      : 0;
      
    const completedWithTimes = fileList.filter(f => 
      f.status === 'completed' && f.uploadStartTime && f.uploadEndTime
    );
    
    const avgUploadTimeMs = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, f) => 
          sum + ((f.uploadEndTime! - f.uploadStartTime!) || 0), 0
        ) / completedWithTimes.length
      : 0;
    
    const remaining = total - completed - failed;
    const estimatedTimeRemaining = remaining > 0 && avgUploadTimeMs > 0 
      ? (remaining * avgUploadTimeMs) / maxConcurrentUploads
      : 0;

    return {
      total,
      completed,
      failed,
      totalSizeKB,
      optimizedSizeKB,
      avgCompressionRatio,
      avgUploadTimeMs,
      estimatedTimeRemaining
    };
  };

  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const validFiles: BulkUploadFile[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`${file.name}: Tipo de archivo no soportado`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Archivo demasiado grande (máx. 50MB)`);
        return;
      }

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        folderId: selectedFolderId,
      });
    });

    if (errors.length > 0) {
      console.warn('Upload validation errors:', errors);
      // TODO: Show error notifications
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFolderId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const removeAllFiles = useCallback(() => {
    setFiles([]);
    uploadQueueRef.current = [];
  }, []);

  const removeCompletedFiles = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);

  const retryFailedFiles = useCallback(() => {
    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        const { error, ...fileWithoutError } = f;
        return { ...fileWithoutError, status: 'pending' as const };
      }
      return f;
    }));
  }, []);

  const uploadFile = useCallback(async (uploadFile: BulkUploadFile): Promise<void> => {
    try {
      const startTime = Date.now();
      
      // Update status
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0, uploadStartTime: startTime }
          : f
      ));

      const formData = new FormData();
      formData.append('files', uploadFile.file);
      formData.append('event_id', eventId);
      if (uploadFile.folderId) {
        formData.append('folder_id', uploadFile.folderId);
      }
      formData.append('photo_type', 'event');
      formData.append('force_optimization', 'true');
      formData.append('target_size_kb', '35');
      formData.append('max_dimension', '500');

      const response = await fetch('/api/admin/photos/simple-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const endTime = Date.now();

      if (result.success && result.photos && result.photos.length > 0) {
        const photo = result.photos[0];
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                photoId: photo.id,
                uploadEndTime: endTime,
                optimizationInfo: photo.optimization || {
                  originalSizeKB: Math.round(uploadFile.file.size / 1024),
                  optimizedSizeKB: photo.file_size ? Math.round(photo.file_size / 1024) : 35,
                  compressionRatio: 70
                }
              }
            : f
        ));
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));
    }
  }, [eventId]);

  const processUploadQueue = useCallback(async () => {
    if (isProcessingRef.current || isPaused) return;
    
    isProcessingRef.current = true;
    
    while (uploadQueueRef.current.length > 0 && !isPaused) {
      const batch = uploadQueueRef.current.splice(0, maxConcurrentUploads);
      
      // Update currently uploading set
      const batchIds = new Set(batch.map(f => f.id));
      setCurrentlyUploading(batchIds);
      
      // Upload batch concurrently
      await Promise.allSettled(
        batch.map(file => uploadFile(file))
      );
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setCurrentlyUploading(new Set());
    isProcessingRef.current = false;
    
    // Check if all uploads are done
    const remainingPending = files.filter(f => f.status === 'pending').length;
    if (remainingPending === 0 && isUploading) {
      setIsUploading(false);
      
      const succeeded = files.filter(f => f.status === 'completed').map(f => f.photoId!);
      const failed = files.filter(f => f.status === 'error').map(f => ({
        filename: f.file.name,
        error: f.error
      }));
      
      onUploadComplete({ succeeded, failed });
    }
  }, [files, isPaused, maxConcurrentUploads, isUploading, uploadFile, onUploadComplete]);

  const startUpload = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    
    uploadQueueRef.current = [...pendingFiles];
    processUploadQueue();
  }, [files, processUploadQueue]);

  const pauseUpload = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeUpload = useCallback(() => {
    setIsPaused(false);
    processUploadQueue();
  }, [processUploadQueue]);

  const getStatusColor = (status: BulkUploadFile['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      case 'paused': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: BulkUploadFile['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      default: return <ImageIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${Math.round(kb / 1024 * 10) / 10} MB`;
  };

  const overallProgress = stats.total > 0 ? ((stats.completed + stats.failed) / stats.total) * 100 : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subida Masiva de Fotos
            </CardTitle>
            {eventName && (
              <p className="text-sm text-muted-foreground mt-1">
                Evento: {eventName}
              </p>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Carpeta de destino</label>
          <Select value={selectedFolderId || ''} onValueChange={setSelectedFolderId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar carpeta (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Raíz del evento</SelectItem>
              {folders.map(folder => (
                <SelectItem key={folder.id} value={folder.id}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span style={{ paddingLeft: `${folder.depth * 12}px` }}>
                      {folder.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-gray-600">Completadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-gray-600">Fallidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(stats.avgCompressionRatio)}%
              </div>
              <div className="text-xs text-gray-600">Compresión</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progreso general</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            {stats.estimatedTimeRemaining > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Tiempo estimado: {formatTime(stats.estimatedTimeRemaining)}</span>
              </div>
            )}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Arrastra fotos aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-500">
            Formatos soportados: JPG, PNG, WebP, HEIC (máx. 50MB cada una)
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Optimización automática a 35KB con watermarks
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Control Buttons */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {!isUploading ? (
              <Button onClick={startUpload} className="gap-2">
                <Play className="h-4 w-4" />
                Subir Todas ({files.filter(f => f.status === 'pending').length})
              </Button>
            ) : isPaused ? (
              <Button onClick={resumeUpload} className="gap-2">
                <Play className="h-4 w-4" />
                Reanudar
              </Button>
            ) : (
              <Button onClick={pauseUpload} variant="secondary" className="gap-2">
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
            )}
            
            {stats.failed > 0 && (
              <Button onClick={retryFailedFiles} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reintentar Fallidas
              </Button>
            )}
            
            {stats.completed > 0 && (
              <Button onClick={removeCompletedFiles} variant="outline" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Limpiar Completadas
              </Button>
            )}
            
            <Button onClick={removeAllFiles} variant="danger" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Limpiar Todo
            </Button>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <ScrollArea className="h-64 w-full border rounded-md">
            <div className="p-4 space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-2 rounded bg-white border">
                  <div className="flex-shrink-0">
                    {getStatusIcon(file.status)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {file.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(file.file.size)}</span>
                        {file.optimizationInfo && (
                          <>
                            <span>→</span>
                            <span className="text-green-600 font-medium">
                              {file.optimizationInfo.optimizedSizeKB}KB
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                    
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Storage Optimization Info */}
        {stats.totalSizeKB > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
              <HardDrive className="h-4 w-4" />
              Optimización de Almacenamiento
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original: </span>
                <span className="font-medium">{Math.round(stats.totalSizeKB / 1024 * 10) / 10} MB</span>
              </div>
              <div>
                <span className="text-gray-600">Optimizado: </span>
                <span className="font-medium text-green-600">
                  {Math.round(stats.optimizedSizeKB / 1024 * 10) / 10} MB
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              💡 Ahorro de {Math.round((1 - stats.optimizedSizeKB/stats.totalSizeKB) * 100)}% de espacio
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}