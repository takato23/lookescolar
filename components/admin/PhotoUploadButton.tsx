'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadIcon, ImageIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploadButtonProps {
  onUpload: (files: File[]) => Promise<void>;
  eventId?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function PhotoUploadButton({
  onUpload,
  eventId,
  disabled = false,
  className,
  variant = 'default',
  size = 'default',
  showIcon = true,
  children,
}: PhotoUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith('image/');
      if (!isValidType) {
        toast.error(`Archivo "${file.name}" no es una imagen válida`);
      }
      return isValidType;
    });

    if (validFiles.length === 0) {
      toast.error('No se seleccionaron archivos de imagen válidos');
      return;
    }

    if (validFiles.length !== files.length) {
      toast.warning(
        `Se ignoraron ${files.length - validFiles.length} archivos no válidos`
      );
    }

    setIsUploading(true);

    try {
      await onUpload(validFiles);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir las fotos');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <Button
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        variant={variant}
        size={size}
        className={className}
      >
        {isUploading ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : showIcon ? (
          <UploadIcon className="h-4 w-4" />
        ) : null}
        {showIcon && <span className="ml-2" />}
        {children || (isUploading ? 'Subiendo...' : 'Subir Fotos')}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
    </>
  );
}
