'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Upload,
  File,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  QrCode,
  Wand2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadResult?: {
    id: string;
    filename: string;
    detected_qr_codes?: string[];
  };
}

interface ProcessingOptions {
  generatePreviews: boolean;
  detectQrCodes: boolean;
  processWatermarks: boolean;
  autoClassify: boolean;
}

interface BulkPhotoUploadProps {
  eventId: string;
  eventName: string;
  onUploadComplete?: (results: any) => void;
}

export default function BulkPhotoUpload({
  eventId,
  eventName,
  onUploadComplete,
}: BulkPhotoUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(
    {
      generatePreviews: true,
      detectQrCodes: true,
      processWatermarks: true,
      autoClassify: false,
    }
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;

        const uploadFile: UploadFile = {
          id,
          file,
          preview,
          status: 'pending',
        };

        setFiles((prev) => [...prev, uploadFile]);
      };

      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = e.dataTransfer.files;
      handleFileSelection(droppedFiles);
    },
    [handleFileSelection]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
    setUploadProgress(0);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert files to base64 for upload
      const photosData = await Promise.all(
        files.map(async (uploadFile) => {
          const base64Data = await convertFileToBase64(uploadFile.file);
          return {
            filename: uploadFile.file.name,
            size: uploadFile.file.size,
            type: uploadFile.file.type,
            base64Data,
          };
        })
      );

      // Update all files to uploading status
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'uploading' as const }))
      );

      // Upload in batches to avoid overwhelming the server
      const batchSize = 10;
      const results: any[] = [];

      for (let i = 0; i < photosData.length; i += batchSize) {
        const batch = photosData.slice(i, i + batchSize);

        const response = await fetch('/api/admin/photos/bulk-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            photos: batch,
            processingOptions,
          }),
        });

        const batchResult = await response.json();

        if (!response.ok) {
          throw new Error(batchResult.error || 'Upload failed');
        }

        results.push(...batchResult.results);

        // Update progress
        const progress = Math.round(
          ((i + batch.length) / photosData.length) * 100
        );
        setUploadProgress(progress);

        // Update file statuses
        setFiles((prev) =>
          prev.map((uploadFile) => {
            const result = batchResult.results.find(
              (r: any) =>
                r.filename === uploadFile.file.name ||
                r.filename.includes(
                  uploadFile.file.name.replace(/\.[^/.]+$/, '')
                )
            );

            if (result) {
              return {
                ...uploadFile,
                status: result.status === 'success' ? 'success' : 'error',
                error: result.error,
                uploadResult: result.status === 'success' ? result : undefined,
              };
            }

            return uploadFile;
          })
        );
      }

      const successful = results.filter((r) => r.status === 'success').length;
      const failed = results.filter((r) => r.status === 'error').length;

      toast.success(
        `Upload completed: ${successful} successful, ${failed} failed`
      );

      if (onUploadComplete) {
        onUploadComplete({
          total: results.length,
          successful,
          failed,
          results,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-gray-400" />;
      case 'uploading':
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  const pendingFiles = files.filter((f) => f.status === 'pending').length;
  const successfulFiles = files.filter((f) => f.status === 'success').length;
  const errorFiles = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Bulk Photo Upload</h3>
        <p className="text-muted-foreground text-sm">
          Upload multiple photos to {eventName}
        </p>
      </div>

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generatePreviews"
                checked={processingOptions.generatePreviews}
                onCheckedChange={(checked) =>
                  setProcessingOptions((prev) => ({
                    ...prev,
                    generatePreviews: !!checked,
                  }))
                }
              />
              <Label htmlFor="generatePreviews" className="text-sm">
                Generate previews
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="detectQrCodes"
                checked={processingOptions.detectQrCodes}
                onCheckedChange={(checked) =>
                  setProcessingOptions((prev) => ({
                    ...prev,
                    detectQrCodes: !!checked,
                  }))
                }
              />
              <Label htmlFor="detectQrCodes" className="text-sm">
                Detect QR codes
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="processWatermarks"
                checked={processingOptions.processWatermarks}
                onCheckedChange={(checked) =>
                  setProcessingOptions((prev) => ({
                    ...prev,
                    processWatermarks: !!checked,
                  }))
                }
              />
              <Label htmlFor="processWatermarks" className="text-sm">
                Process watermarks
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoClassify"
                checked={processingOptions.autoClassify}
                onCheckedChange={(checked) =>
                  setProcessingOptions((prev) => ({
                    ...prev,
                    autoClassify: !!checked,
                  }))
                }
              />
              <Label htmlFor="autoClassify" className="text-sm">
                Auto-classify (experimental)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h4 className="mb-2 text-lg font-medium">
              Drop photos here or click to browse
            </h4>
            <p className="text-muted-foreground mb-4 text-sm">
              Supports JPEG, PNG, WebP. Maximum 10MB per file.
            </p>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Photos
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelection(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Selected Photos ({files.length})
              </CardTitle>

              <div className="flex items-center gap-2">
                {successfulFiles > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    {successfulFiles} uploaded
                  </Badge>
                )}
                {errorFiles > 0 && (
                  <Badge variant="destructive">{errorFiles} failed</Badge>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${getStatusColor(uploadFile.status)}`}
                  >
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 overflow-hidden rounded bg-gray-100">
                        <img
                          src={uploadFile.preview}
                          alt={uploadFile.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>

                      {uploadFile.error && (
                        <p className="mt-1 text-xs text-red-600">
                          {uploadFile.error}
                        </p>
                      )}

                      {uploadFile.uploadResult?.detected_qr_codes &&
                        uploadFile.uploadResult.detected_qr_codes.length >
                          0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <QrCode className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600">
                              {uploadFile.uploadResult.detected_qr_codes.length}{' '}
                              QR codes detected
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadFile.status)}

                      {uploadFile.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading photos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={uploadFiles}
          disabled={files.length === 0 || uploading || pendingFiles === 0}
          className="flex-1"
        >
          {uploading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {pendingFiles} Photo{pendingFiles !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      {files.length > 0 && !uploading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {pendingFiles > 0 && `${pendingFiles} photos ready to upload. `}
            {successfulFiles > 0 &&
              `${successfulFiles} photos uploaded successfully. `}
            {errorFiles > 0 && `${errorFiles} photos failed to upload.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
