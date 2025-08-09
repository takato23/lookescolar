'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, Image, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SimpleUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No hay archivos para subir');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/admin/photos/simple-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.successful} fotos subidas correctamente`);
        setResults(data.uploaded || []);

        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: any) => {
            toast.error(`Error con ${err.filename}: ${err.error}`);
          });
        }

        // Limpiar archivos exitosos
        setFiles([]);
      } else {
        toast.error(data.error || 'Error al subir las fotos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Subir Fotos (Simple)</h1>

      <Card className="mb-6 p-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg">Suelta las fotos aquí...</p>
          ) : (
            <div>
              <p className="mb-2 text-lg">
                Arrastra fotos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG, WebP (máximo 10MB por archivo)
              </p>
            </div>
          )}
        </div>
      </Card>

      {files.length > 0 && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Archivos seleccionados ({files.length})
          </h2>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded bg-gray-50 p-2"
              >
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0}
              className="flex-1"
            >
              {uploading
                ? 'Subiendo...'
                : `Subir ${files.length} foto${files.length !== 1 ? 's' : ''}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Limpiar
            </Button>
          </div>
        </Card>
      )}

      {uploading && (
        <Card className="mb-6 p-6">
          <h3 className="mb-2 text-lg font-semibold">Procesando...</h3>
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-gray-500">
            Aplicando watermark y generando thumbnails...
          </p>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Fotos subidas exitosamente
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {results.map((result, index) => (
              <div key={index} className="rounded border p-2">
                <p className="truncate text-xs">{result.filename}</p>
                <p className="mt-1 text-xs text-gray-500">ID: {result.id}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              onClick={() => {
                setResults([]);
                setProgress(0);
              }}
              variant="outline"
              className="w-full"
            >
              Subir más fotos
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
