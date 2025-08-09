'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Image,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate';
  preview?: string;
  error?: string;
  progress?: number;
  isDuplicate?: boolean;
  duplicateOf?: string;
  hash?: string;
  result?: {
    id: string;
    filename: string;
    size: number;
    width: number;
    height: number;
  };
}

interface PhotoUploaderProps {
  eventId: string;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (errors: any[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateFileId = () => Math.random().toString(36).substr(2, 9);

export default function PhotoUploader({
  eventId,
  onUploadComplete,
  onUploadError,
  maxFiles = 20,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB por archivo
  className,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<{
    processed: number;
    errors: number;
    duplicates: number;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar archivo
  const validateFile = useCallback(
    (file: File): string | null => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];

      if (!validTypes.includes(file.type)) {
        return 'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF)';
      }

      if (file.size > maxSizeBytes) {
        return `Archivo muy grande. Máximo ${formatFileSize(maxSizeBytes)}`;
      }

      return null;
    },
    [maxSizeBytes]
  );

  // Generar preview de imagen
  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  // Agregar archivos
  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      // Verificar límite total
      if (files.length + fileArray.length > maxFiles) {
        alert(`No se pueden agregar más de ${maxFiles} archivos`);
        return;
      }

      const validFiles: UploadFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        const preview = file.type.startsWith('image/')
          ? await generatePreview(file)
          : undefined;

        validFiles.push({
          id: generateFileId(),
          file,
          status: error ? 'error' : 'pending',
          preview,
          error,
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [files.length, maxFiles, validateFile, generatePreview]
  );

  // Eliminar archivo
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Subir archivos
  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) {
      alert('No hay archivos válidos para subir');
      return;
    }

    setIsUploading(true);

    // Marcar archivos como subiendo
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending'
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('eventId', eventId);

      pendingFiles.forEach(({ file }) => {
        formData.append('files', file);
      });

      // Simular progreso de carga (XMLHttpRequest para progress real)
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setGlobalProgress(Math.round(percentComplete));

            // Actualizar progreso individual de archivos
            setFiles((prev) =>
              prev.map((f) =>
                f.status === 'uploading'
                  ? { ...f, progress: Math.round(percentComplete) }
                  : f
              )
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.open('POST', '/api/admin/photos/upload');
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (result.success) {
        setUploadStats(result.stats || null);
        // Marcar archivos exitosos
        setFiles((prev) =>
          prev.map((f) => {
            if (f.status === 'uploading') {
              const uploadResult = result.uploaded?.find(
                (u: any) => u.filename === f.file.name
              );
              if (uploadResult) {
                return {
                  ...f,
                  status: 'success' as const,
                  progress: 100,
                  result: uploadResult,
                };
              }
            }
            return f;
          })
        );

        onUploadComplete?.(result.uploaded || []);
      }

      // Manejar duplicados
      if (result.duplicates?.length > 0) {
        setFiles((prev) =>
          prev.map((f) => {
            const duplicate = result.duplicates.find(
              (d: any) => d.originalName === f.file.name
            );
            if (duplicate && f.status === 'uploading') {
              return {
                ...f,
                status: 'duplicate' as const,
                isDuplicate: true,
                duplicateOf: duplicate.duplicateOf,
                hash: duplicate.hash,
                error: `Duplicado de ${duplicate.duplicateOf}`,
              };
            }
            return f;
          })
        );
      }

      if (result.errors?.length > 0) {
        // Marcar archivos con error
        setFiles((prev) =>
          prev.map((f) => {
            const error = result.errors.find(
              (e: any) => e.filename === f.file.name
            );
            if (error && f.status === 'uploading') {
              return {
                ...f,
                status: 'error' as const,
                error: error.error,
              };
            }
            return f;
          })
        );

        onUploadError?.(result.errors);
      }
    } catch (error) {
      console.error('Error uploading:', error);

      // Marcar todos los archivos subiendo como error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: 'Error de red' }
            : f
        )
      );

      alert('Error al subir archivos');
    } finally {
      setIsUploading(false);
      setGlobalProgress(0);
    }
  }, [files, eventId, onUploadComplete, onUploadError]);

  // Handlers de drag & drop
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

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  // Handler de input file
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  const pendingFilesCount = files.filter((f) => f.status === 'pending').length;
  const successFilesCount = files.filter((f) => f.status === 'success').length;
  const errorFilesCount = files.filter((f) => f.status === 'error').length;
  const duplicateFilesCount = files.filter(
    (f) => f.status === 'duplicate'
  ).length;

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Zona de drop */}
      <Card
        className={cn(
          'border-2 border-dashed border-gray-300 p-8 text-center transition-colors',
          isDragOver && 'border-blue-400 bg-blue-50',
          files.length === 0 && 'py-16'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <Upload className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              Arrastra las fotos aquí o{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 underline hover:text-blue-700"
                disabled={isUploading}
              >
                selecciona archivos
              </button>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Máximo {maxFiles} archivos, {formatFileSize(maxSizeBytes)} por
              archivo
            </p>
          </div>
        </div>
      </Card>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Archivos seleccionados ({files.length})
            </h3>
            <div className="flex gap-2">
              {pendingFilesCount > 0 && (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    onClick={uploadFiles}
                    disabled={isUploading}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isUploading
                      ? `Subiendo... ${globalProgress}%`
                      : `Subir ${pendingFilesCount} archivos`}
                  </Button>

                  {/* Progress bar global */}
                  {isUploading && globalProgress > 0 && (
                    <div className="w-40">
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${globalProgress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-500">
                        Progreso global: {globalProgress}%
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                disabled={isUploading}
              >
                Limpiar todo
              </Button>
            </div>
          </div>

          <div className="grid max-h-96 gap-2 overflow-y-auto">
            {files.map((uploadFile) => (
              <Card key={uploadFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {uploadFile.preview ? (
                      <img
                        src={uploadFile.preview}
                        alt={uploadFile.file.name}
                        className="h-12 w-12 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded border bg-gray-100">
                        <Image className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(uploadFile.file.size)}</span>
                      {uploadFile.result && (
                        <>
                          <span>•</span>
                          <span>
                            {uploadFile.result.width} ×{' '}
                            {uploadFile.result.height}
                          </span>
                        </>
                      )}
                    </div>

                    {uploadFile.error && (
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          uploadFile.status === 'duplicate'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {uploadFile.error}
                        {uploadFile.isDuplicate && uploadFile.hash && (
                          <span className="ml-1 font-mono">
                            (hash: {uploadFile.hash.substring(0, 8)}...)
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'pending' && (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                    )}

                    {uploadFile.status === 'uploading' && (
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    )}

                    {uploadFile.status === 'success' && (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )}

                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    )}

                    {uploadFile.status === 'duplicate' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-100">
                        <span className="text-xs font-bold text-yellow-700">
                          D
                        </span>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={isUploading}
                      className="p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {uploadFile.status === 'uploading' &&
                  uploadFile.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
              </Card>
            ))}
          </div>

          {/* Summary */}
          {(successFilesCount > 0 ||
            errorFilesCount > 0 ||
            duplicateFilesCount > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                {successFilesCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {successFilesCount} exitosos
                  </span>
                )}
                {errorFilesCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {errorFilesCount} con errores
                  </span>
                )}
                {duplicateFilesCount > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-yellow-600">
                      <span className="text-xs font-bold">D</span>
                    </div>
                    {duplicateFilesCount} duplicados
                  </span>
                )}
              </div>

              {/* Upload stats */}
              {uploadStats && (
                <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
                  <p className="font-medium">Estadísticas del upload:</p>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    <span>Procesados: {uploadStats.processed}</span>
                    <span>Errores: {uploadStats.errors}</span>
                    <span>Duplicados: {uploadStats.duplicates}</span>
                    <span>Total: {uploadStats.total}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
