'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image,
  Loader2,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Eye,
  Info,
  Settings,
  Maximize2,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface ProUploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'paused';
  preview?: string;
  error?: string;
  progress: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
  result?: {
    id: string;
    filename: string;
    size: number;
    width: number;
    height: number;
  };
  metadata?: {
    exif?: any;
    dimensions?: { width: number; height: number };
  };
}

interface ProUploaderProps {
  eventId: string;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (errors: any[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'pending' | 'uploading' | 'success' | 'error';
type SortMode = 'name' | 'size' | 'status' | 'progress';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const formatSpeed = (bytesPerSecond: number) => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

const generateFileId = () => Math.random().toString(36).substr(2, 9);

export function ProUploader({
  eventId,
  onUploadComplete,
  onUploadError,
  maxFiles = 100,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  className,
}: ProUploaderProps) {
  const [files, setFiles] = useState<ProUploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProUploadFile | null>(null);
  const [concurrentUploads, setConcurrentUploads] = useState(3);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/heic',
      ];

      if (!validTypes.includes(file.type.toLowerCase())) {
        return 'Tipo de archivo no válido. Solo imágenes (JPEG, PNG, WebP, GIF, HEIC)';
      }

      if (file.size > maxSizeBytes) {
        return `Archivo muy grande. Máximo ${formatFileSize(maxSizeBytes)}`;
      }

      return null;
    },
    [maxSizeBytes]
  );

  // Generate preview
  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Extract metadata
  const extractMetadata = useCallback(async (file: File): Promise<any> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({
          dimensions: {
            width: img.width,
            height: img.height,
          },
        });
      };
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Add files
  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      if (files.length + fileArray.length > maxFiles) {
        alert(`No se pueden agregar más de ${maxFiles} archivos`);
        return;
      }

      const validFiles: ProUploadFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        let preview: string | undefined;
        let metadata: any = {};

        try {
          if (file.type.startsWith('image/')) {
            [preview, metadata] = await Promise.all([
              generatePreview(file),
              extractMetadata(file),
            ]);
          }
        } catch (err) {
          console.warn('Error generating preview or metadata:', err);
        }

        validFiles.push({
          id: generateFileId(),
          file,
          status: error ? 'error' : 'pending',
          preview,
          error,
          progress: 0,
          metadata,
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [files.length, maxFiles, validateFile, generatePreview, extractMetadata]
  );

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    abortControllers.current.get(fileId)?.abort();
    abortControllers.current.delete(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
  }, []);

  // Upload single file
  const uploadSingleFile = useCallback(
    async (uploadFile: ProUploadFile): Promise<void> => {
      const controller = new AbortController();
      abortControllers.current.set(uploadFile.id, controller);

      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastProgressLoaded = 0;

      try {
        const formData = new FormData();
        formData.append('eventId', eventId);
        formData.append('files', uploadFile.file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded * 100) / e.total);
              const currentTime = Date.now();
              const timeDiff = currentTime - lastProgressTime;

              if (timeDiff > 1000) {
                // Update speed every second
                const bytesDiff = e.loaded - lastProgressLoaded;
                const speed = bytesDiff / (timeDiff / 1000);
                const timeRemaining =
                  speed > 0 ? (e.total - e.loaded) / speed : 0;

                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id
                      ? { ...f, progress, speed, timeRemaining }
                      : f
                  )
                );

                lastProgressTime = currentTime;
                lastProgressLoaded = e.loaded;
              } else {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id ? { ...f, progress } : f
                  )
                );
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              const result = JSON.parse(xhr.responseText);
              if (result.success) {
                const uploadResult = result.uploaded?.[0];
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id
                      ? {
                          ...f,
                          status: 'success',
                          progress: 100,
                          result: uploadResult,
                        }
                      : f
                  )
                );
                resolve();
              } else {
                throw new Error(result.error || 'Upload failed');
              }
            } else {
              throw new Error(`HTTP ${xhr.status}`);
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.onabort = () => reject(new Error('Upload aborted'));

          controller.signal.addEventListener('abort', () => {
            xhr.abort();
          });

          xhr.open('POST', '/api/admin/photos/upload');
          xhr.send(formData);
        });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                }
              : f
          )
        );
        throw error;
      } finally {
        abortControllers.current.delete(uploadFile.id);
      }
    },
    [eventId]
  );

  // Upload files with concurrency control
  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) {
      alert('No hay archivos válidos para subir');
      return;
    }

    setIsUploading(true);
    setIsPaused(false);

    // Mark files as uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading' } : f
      )
    );

    const results: any[] = [];
    const errors: any[] = [];

    // Process files in batches
    for (let i = 0; i < pendingFiles.length; i += concurrentUploads) {
      if (isPaused) break;

      const batch = pendingFiles.slice(i, i + concurrentUploads);
      const promises = batch.map((file) =>
        uploadSingleFile(file).then(
          () => results.push(file),
          (error) => errors.push({ file, error })
        )
      );

      await Promise.all(promises);
    }

    if (results.length > 0) {
      onUploadComplete?.(results);
    }

    if (errors.length > 0) {
      onUploadError?.(errors);
    }

    setIsUploading(false);
  }, [
    files,
    concurrentUploads,
    isPaused,
    uploadSingleFile,
    onUploadComplete,
    onUploadError,
  ]);

  // Pause/resume upload
  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      uploadFiles();
    } else {
      setIsPaused(true);
      // Abort current uploads
      abortControllers.current.forEach((controller) => controller.abort());
      abortControllers.current.clear();
    }
  }, [isPaused, uploadFiles]);

  // Retry failed files
  const retryFailedFiles = useCallback(() => {
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'error'
          ? { ...f, status: 'pending', error: undefined, progress: 0 }
          : f
      )
    );
  }, []);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];

      const processItems = async (items: DataTransferItem[]) => {
        for (const item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }

        if (files.length > 0) {
          addFiles(files);
        }
      };

      processItems(items);
    },
    [addFiles]
  );

  // File selection handlers
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  const handleFolderSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter((file) => {
      switch (filterMode) {
        case 'pending':
          return file.status === 'pending';
        case 'uploading':
          return file.status === 'uploading';
        case 'success':
          return file.status === 'success';
        case 'error':
          return file.status === 'error';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.file.name.localeCompare(b.file.name);
        case 'size':
          return b.file.size - a.file.size;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'progress':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const completedSize = files
    .filter((f) => f.status === 'success')
    .reduce((sum, f) => sum + f.file.size, 0);
  const overallProgress =
    files.length > 0 ? Math.round((completedSize * 100) / totalSize) : 0;

  const statusCounts = {
    pending: files.filter((f) => f.status === 'pending').length,
    uploading: files.filter((f) => f.status === 'uploading').length,
    success: files.filter((f) => f.status === 'success').length,
    error: files.filter((f) => f.status === 'error').length,
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Upload Zone */}
      <Card
        className={cn(
          'border-border border-2 border-dashed transition-all duration-300',
          isDragOver && 'border-primary-400 bg-primary-50 dark:bg-primary-950',
          files.length === 0 && 'py-16'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore - webkitdirectory is not in types
            webkitdirectory=""
            multiple
            onChange={handleFolderSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <Upload className="text-muted-foreground h-16 w-16" />
            <div>
              <h3 className="text-foreground mb-2 text-xl font-semibold">
                Sube tus fotos profesionales
              </h3>
              <p className="text-muted-foreground mb-4">
                Arrastra archivos aquí o selecciona desde tu computadora
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  variant="secondary"
                >
                  <Image className="mr-2 h-4 w-4" />
                  Seleccionar Archivos
                </Button>
                <Button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isUploading}
                  variant="outline"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Seleccionar Carpeta
                </Button>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Máximo {maxFiles} archivos • {formatFileSize(maxSizeBytes)} por
                archivo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Management */}
      {files.length > 0 && (
        <>
          {/* Header with stats and controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    {files.length} archivos • {formatFileSize(totalSize)}
                  </CardTitle>
                  <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
                    <span className="text-yellow-600">
                      {statusCounts.pending} pendientes
                    </span>
                    <span className="text-blue-600">
                      {statusCounts.uploading} subiendo
                    </span>
                    <span className="text-green-600">
                      {statusCounts.success} exitosos
                    </span>
                    <span className="text-red-600">
                      {statusCounts.error} con errores
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View mode toggle */}
                  <div className="flex rounded-lg border">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Filter */}
                  <select
                    value={filterMode}
                    onChange={(e) =>
                      setFilterMode(e.target.value as FilterMode)
                    }
                    className="bg-background rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="uploading">Subiendo</option>
                    <option value="success">Exitosos</option>
                    <option value="error">Con errores</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="bg-background rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <option value="name">Por nombre</option>
                    <option value="size">Por tamaño</option>
                    <option value="status">Por estado</option>
                    <option value="progress">Por progreso</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Progreso general</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {statusCounts.pending > 0 && !isUploading && (
                    <Button
                      onClick={uploadFiles}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Subir {statusCounts.pending} archivos
                    </Button>
                  )}

                  {isUploading && (
                    <Button onClick={togglePause} variant="outline">
                      {isPaused ? (
                        <Play className="mr-2 h-4 w-4" />
                      ) : (
                        <Pause className="mr-2 h-4 w-4" />
                      )}
                      {isPaused ? 'Reanudar' : 'Pausar'}
                    </Button>
                  )}

                  {statusCounts.error > 0 && (
                    <Button onClick={retryFailedFiles} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reintentar errores
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiles([])}
                  >
                    Limpiar todo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files grid/list */}
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                : 'space-y-2'
            )}
          >
            {filteredAndSortedFiles.map((uploadFile) => (
              <FileItem
                key={uploadFile.id}
                file={uploadFile}
                viewMode={viewMode}
                isSelected={selectedFiles.includes(uploadFile.id)}
                onRemove={() => removeFile(uploadFile.id)}
                onPreview={() => {
                  setPreviewFile(uploadFile);
                  setShowPreview(true);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface FileItemProps {
  file: ProUploadFile;
  viewMode: ViewMode;
  isSelected: boolean;
  onRemove: () => void;
  onPreview: () => void;
}

function FileItem({
  file,
  viewMode,
  isSelected,
  onRemove,
  onPreview,
}: FileItemProps) {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'pending':
        return (
          <div className="border-muted-foreground h-4 w-4 rounded-full border-2" />
        );
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'pending':
        return 'border-yellow-200';
      case 'uploading':
        return 'border-blue-200';
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
      default:
        return 'border-border';
    }
  };

  if (viewMode === 'grid') {
    return (
      <Card className={cn('group relative', getStatusColor())}>
        <CardContent className="p-3">
          {/* Preview */}
          <div className="bg-muted relative mb-3 aspect-square overflow-hidden rounded-lg">
            {file.preview ? (
              <img
                src={file.preview}
                alt={file.file.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Image className="text-muted-foreground h-8 w-8" />
              </div>
            )}

            {/* Overlay with actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="sm" variant="secondary" onClick={onPreview}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="danger" onClick={onRemove}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status badge */}
            <div className="absolute right-2 top-2">{getStatusIcon()}</div>
          </div>

          {/* File info */}
          <div className="space-y-1">
            <p className="truncate text-xs font-medium" title={file.file.name}>
              {file.file.name}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatFileSize(file.file.size)}
            </p>

            {file.metadata?.dimensions && (
              <p className="text-muted-foreground text-xs">
                {file.metadata.dimensions.width} ×{' '}
                {file.metadata.dimensions.height}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {file.status === 'uploading' && (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{file.progress}%</span>
                {file.speed && <span>{formatSpeed(file.speed)}</span>}
              </div>
              <div className="bg-muted h-1 w-full rounded-full">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              {file.timeRemaining && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatTime(file.timeRemaining)} restante
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {file.error && (
            <p className="mt-2 line-clamp-2 text-xs text-red-600">
              {file.error}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card className={cn('group', getStatusColor())}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Preview thumbnail */}
          <div className="flex-shrink-0">
            {file.preview ? (
              <img
                src={file.preview}
                alt={file.file.name}
                className="h-12 w-12 rounded border object-cover"
              />
            ) : (
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded border">
                <Image className="text-muted-foreground h-6 w-6" />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium">{file.file.name}</p>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span>{formatFileSize(file.file.size)}</span>
              {file.metadata?.dimensions && (
                <>
                  <span>•</span>
                  <span>
                    {file.metadata.dimensions.width} ×{' '}
                    {file.metadata.dimensions.height}
                  </span>
                </>
              )}
              {file.speed && (
                <>
                  <span>•</span>
                  <span>{formatSpeed(file.speed)}</span>
                </>
              )}
            </div>

            {file.error && (
              <p className="line-clamp-1 text-xs text-red-600">{file.error}</p>
            )}
          </div>

          {/* Progress */}
          {file.status === 'uploading' && (
            <div className="w-32 flex-shrink-0">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{file.progress}%</span>
                {file.timeRemaining && (
                  <span>{formatTime(file.timeRemaining)}</span>
                )}
              </div>
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status and actions */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}

            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button size="sm" variant="ghost" onClick={onPreview}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
