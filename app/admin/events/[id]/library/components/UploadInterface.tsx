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
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  photoId?: string;
  optimizationInfo?: {
    originalSizeKB: number;
    optimizedSizeKB: number;
    compressionRatio: number;
  };
}

interface UploadInterfaceProps {
  eventId: string;
  currentFolderId: string | null;
  currentFolderName?: string;
  onUploadComplete: (photoIds: string[]) => void;
  onClose?: () => void;
  className?: string;
  initialFiles?: File[];
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
const MAX_FILES = 20; // Maximum files per upload session

export function UploadInterface({
  eventId,
  currentFolderId,
  currentFolderName,
  onUploadComplete,
  onClose,
  className,
  initialFiles,
}: UploadInterfaceProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Prefill queue when opening with dropped files
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const fileArray = Array.from(initialFiles);
      const toAdd: UploadFile[] = fileArray.slice(0, MAX_FILES).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...toAdd]);
    }
  }, [initialFiles]);

  // Handle file selection
  const handleFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);
      const validFiles: UploadFile[] = [];
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

        // Check if we're not exceeding the limit
        if (files.length + validFiles.length >= MAX_FILES) {
          errors.push(`Máximo ${MAX_FILES} archivos por carga`);
          return;
        }

        validFiles.push({
          id: crypto.randomUUID(),
          file,
          status: 'pending',
          progress: 0,
        });
      });

      if (errors.length > 0) {
        // TODO: Show error notifications
        console.error('Upload errors:', errors);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [files.length]
  );

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        // Reset input value so same file can be selected again
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Upload a single file
  const uploadFile = useCallback(
    async (uploadFile: UploadFile): Promise<string | null> => {
      try {
        // Update status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        // Use the FreeTierOptimizer endpoint for proper compression and watermarking
        const formData = new FormData();
        formData.append('files', uploadFile.file);
        formData.append('event_id', eventId);
        if (currentFolderId) {
          formData.append('folder_id', currentFolderId);
        }
        formData.append('photo_type', 'event'); // Mark as event photo

        // Force aggressive optimization settings
        formData.append('force_optimization', 'true');
        formData.append('target_size_kb', '35'); // Explicit 35KB target
        formData.append('max_dimension', '500'); // Explicit dimension limit

        // Upload to the optimized endpoint that applies FreeTierOptimizer
        const uploadResponse = await fetch('/api/admin/photos/simple-upload', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Important: include cookies for auth
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const uploadData = await uploadResponse.json();

        if (
          !uploadData.success ||
          !uploadData.uploaded ||
          uploadData.uploaded.length === 0
        ) {
          throw new Error(
            uploadData.error || 'No photos were uploaded successfully'
          );
        }

        const uploadedPhoto = uploadData.uploaded[0];

        // Log optimization results for user feedback
        const originalSizeKB = Math.round(uploadFile.file.size / 1024);
        const optimizedSizeKB = uploadedPhoto.file_size
          ? Math.round(uploadedPhoto.file_size / 1024)
          : 0;
        const compressionRatio =
          originalSizeKB > 0
            ? Math.round((1 - optimizedSizeKB / originalSizeKB) * 100)
            : 0;

        console.log(
          `Photo optimized: ${originalSizeKB}KB → ${optimizedSizeKB}KB (${compressionRatio}% reduction)`
        );

        // Update as completed with optimization info
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  photoId: uploadedPhoto.id,
                  optimizationInfo: {
                    originalSizeKB,
                    optimizedSizeKB,
                    compressionRatio,
                  },
                }
              : f
          )
        );

        return uploadedPhoto.id;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: errorMessage }
              : f
          )
        );

        return null;
      }
    },
    [eventId, currentFolderId]
  );

  // Start upload process
  const startUpload = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const photoIds: string[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files.filter((f) => f.status === 'pending')) {
      const photoId = await uploadFile(file);
      if (photoId) {
        photoIds.push(photoId);
      }
    }

    setIsUploading(false);

    // Notify completion
    if (photoIds.length > 0) {
      onUploadComplete(photoIds);
    }
  }, [files, isUploading, uploadFile, onUploadComplete]);

  // Clear completed files
  const clearCompletedFiles = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'completed'));
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Calculate overall progress
  const overallProgress =
    files.length > 0
      ? Math.round(
          files.reduce((sum, file) => sum + file.progress, 0) / files.length
        )
      : 0;

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-medium text-foreground">Subir Fotos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentFolderName ? (
                  <>
                    <FolderOpen className="mr-1 inline h-4 w-4" />
                    {currentFolderName}
                  </>
                ) : (
                  'Carpeta raíz'
                )}
              </p>
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                {completedCount} completado{completedCount !== 1 ? 's' : ''},{' '}
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''},{' '}
                {errorCount} error{errorCount !== 1 ? 'es' : ''}
              </span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed p-8 text-center transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-border hover:border-gray-400',
          files.length > 0 && 'border-b-0'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>

          <div>
            <p className="text-lg font-medium text-foreground">
              Arrastra fotos aquí o{' '}
              <button
                type="button"
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                onClick={() => fileInputRef.current?.click()}
              >
                busca archivos
              </button>
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              JPG, PNG, WebP, HEIC hasta 50MB. Máximo {MAX_FILES} archivos.
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="border-t border-border">
          <div className="max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-b-0"
              >
                {/* File icon and info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="truncate text-sm font-medium text-foreground">
                      {file.file.name}
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {Math.round(file.file.size / 1024)}KB
                      {file.optimizationInfo && (
                        <span className="ml-1 text-green-600">
                          → {file.optimizationInfo.optimizedSizeKB}KB (-
                          {file.optimizationInfo.compressionRatio}%)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress bar for individual file */}
                  {file.status === 'uploading' ||
                  file.status === 'processing' ? (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-1" />
                    </div>
                  ) : null}

                  {/* Error message */}
                  {file.error && (
                    <p className="mt-1 text-xs text-red-600">{file.error}</p>
                  )}
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {file.status === 'pending' && (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  {(file.status === 'uploading' ||
                    file.status === 'processing') && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>

                {/* Remove button */}
                {file.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between bg-muted p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompletedFiles}
                disabled={completedCount === 0}
              >
                Limpiar completados
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFiles}
                disabled={files.length === 0 || isUploading}
              >
                Limpiar todo
              </Button>
            </div>

            <Button
              onClick={startUpload}
              disabled={pendingCount === 0 || isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Subir {pendingCount} archivo{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
