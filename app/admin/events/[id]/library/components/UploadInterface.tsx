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
  Circle
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
  uploadUrl?: string;
  uploadId?: string;
  storagePath?: string;
  filename?: string;
  photoId?: string;
}

interface UploadInterfaceProps {
  eventId: string;
  currentFolderId: string | null;
  currentFolderName?: string;
  onUploadComplete: (photoIds: string[]) => void;
  onClose?: () => void;
  className?: string;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20; // Maximum files per upload session

export function UploadInterface({
  eventId,
  currentFolderId,
  currentFolderName,
  onUploadComplete,
  onClose,
  className
}: UploadInterfaceProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Handle file selection
  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const validFiles: UploadFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
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
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [files.length]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  }, [handleFiles]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Upload a single file
  const uploadFile = useCallback(async (uploadFile: UploadFile): Promise<string | null> => {
    try {
      // Update status
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // Step 1: Get upload URL
      const uploadUrlResponse = await fetch(`/api/admin/events/${eventId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.file.name,
          contentType: uploadFile.file.type,
          fileSize: uploadFile.file.size,
          folderId: currentFolderId,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const uploadUrlData = await uploadUrlResponse.json();
      
      // Update with upload details
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              uploadUrl: uploadUrlData.uploadUrl,
              uploadId: uploadUrlData.uploadId,
              storagePath: uploadUrlData.storagePath,
              filename: uploadUrlData.filename,
              progress: 10
            }
          : f
      ));

      // Step 2: Upload to storage
      const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: 'PUT',
        body: uploadFile.file,
        headers: {
          'Content-Type': uploadFile.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Update progress
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'processing', progress: 70 }
          : f
      ));

      // Step 3: Finalize upload (create database record)
      const finalizeResponse = await fetch('/api/admin/photos/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadUrlData.uploadId,
          storagePath: uploadUrlData.storagePath,
          filename: uploadUrlData.filename,
          originalFilename: uploadFile.file.name,
          eventId,
          folderId: currentFolderId,
          metadata: {
            contentType: uploadFile.file.type,
            fileSize: uploadFile.file.size,
            uploadedAt: new Date().toISOString(),
          },
        }),
      });

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json();
        throw new Error(errorData.error || 'Failed to finalize upload');
      }

      const finalizeData = await finalizeResponse.json();

      // Update as completed
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              photoId: finalizeData.photo.id
            }
          : f
      ));

      return finalizeData.photo.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      return null;
    }
  }, [eventId, currentFolderId]);

  // Start upload process
  const startUpload = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const photoIds: string[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files.filter(f => f.status === 'pending')) {
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
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Calculate overall progress
  const overallProgress = files.length > 0 
    ? Math.round(files.reduce((sum, file) => sum + file.progress, 0) / files.length)
    : 0;

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Subir Fotos</h3>
              <p className="text-sm text-gray-600">
                {currentFolderName ? (
                  <>
                    <FolderOpen className="h-4 w-4 inline mr-1" />
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
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                {completedCount} completado{completedCount !== 1 ? 's' : ''}, {' '}
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}, {' '}
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
          "p-8 text-center border-2 border-dashed transition-colors",
          isDragOver 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400",
          files.length > 0 && "border-b-0"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Upload className="h-6 w-6 text-gray-600" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              Arrastra fotos aquí o{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 underline"
                onClick={() => fileInputRef.current?.click()}
              >
                busca archivos
              </button>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              JPG, PNG, WebP, HEIC hasta 50MB. Máximo {MAX_FILES} archivos.
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
              >
                {/* File icon and info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {Math.round(file.file.size / 1024)}KB
                    </span>
                  </div>
                  
                  {/* Progress bar for individual file */}
                  {file.status === 'uploading' || file.status === 'processing' ? (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-1" />
                    </div>
                  ) : null}
                  
                  {/* Error message */}
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {file.status === 'pending' && (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
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
          <div className="p-4 bg-gray-50 flex items-center justify-between">
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