'use client';

import React, { useState } from 'react';
import PhotoGalleryModern from './PhotoGalleryModern';
import { toast } from 'sonner';

// Demo component showing QR Scanner integration with PhotoGalleryModern
const QRTaggingDemo: React.FC = () => {
  const [photos] = useState([
    {
      id: '1',
      original_filename: 'IMG_001.jpg',
      storage_path: '/photos/1.jpg',
      preview_url: '/api/photos/1/preview',
      file_size: 2048000,
      created_at: new Date().toISOString(),
      approved: false,
      tagged: false,
      event_id: 'event-1',
      width: 1920,
      height: 1080,
    },
    {
      id: '2',
      original_filename: 'IMG_002.jpg',
      storage_path: '/photos/2.jpg',
      preview_url: '/api/photos/2/preview',
      file_size: 1856000,
      created_at: new Date().toISOString(),
      approved: true,
      tagged: true,
      event_id: 'event-1',
      subject: {
        id: 'student-123',
        name: 'Juan Pérez',
      },
      width: 1920,
      height: 1080,
    },
  ]);

  const [events] = useState([
    {
      id: 'event-1',
      name: 'Graduación 2024',
      event_date: '2024-12-15',
      school_name: 'Escuela Primaria San José',
      photo_count: 2,
      created_at: new Date().toISOString(),
    },
  ]);

  const handlePhotoUpload = async (files: File[], eventId: string) => {
    toast.success(`${files.length} fotos subidas al evento ${eventId}`);
  };

  const handlePhotoDelete = async (photoIds: string[]) => {
    toast.success(`${photoIds.length} fotos eliminadas`);
  };

  const handlePhotoApprove = async (photoIds: string[], approved: boolean) => {
    toast.success(
      `${photoIds.length} fotos ${approved ? 'aprobadas' : 'desaprobadas'}`
    );
  };

  const handlePhotoTag = async (photoId: string, subjectId: string) => {
    // Simulate API call to tag photo
    console.log(`Tagging photo ${photoId} with subject ${subjectId}`);
    return Promise.resolve();
  };

  const handleRefresh = () => {
    toast.info('Datos actualizados');
  };

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Demo: QR Tagging System
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Prueba el sistema integrado de etiquetado QR para asignar fotos a
            estudiantes.
          </p>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">Instrucciones:</h2>
            <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>
                Haz clic en "Modo QR" para activar el etiquetado por código QR
              </li>
              <li>
                Presiona "Escanear QR" para abrir la cámara o subir una imagen
              </li>
              <li>
                Una vez detectado el estudiante, selecciona las fotos a
                etiquetar
              </li>
              <li>
                Presiona "Asignar a [Estudiante]" para completar el etiquetado
              </li>
              <li>
                Puedes cambiar de estudiante o salir del modo QR en cualquier
                momento
              </li>
            </ol>
          </div>

          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h2 className="mb-2 font-semibold text-yellow-900">
              Formatos QR soportados:
            </h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-yellow-800">
              <li>
                <code>LKSTUDENT_Abc123Token</code> - Formato canonico
              </li>
              <li>
                <code>STUDENT:uuid:nombre:eventId</code> - Legacy (compatibilidad temporal)
              </li>
            </ul>
          </div>
        </div>

        <PhotoGalleryModern
          initialPhotos={photos}
          initialEvents={events}
          onPhotoUpload={handlePhotoUpload}
          onPhotoDelete={handlePhotoDelete}
          onPhotoApprove={handlePhotoApprove}
          onPhotoTag={handlePhotoTag}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default QRTaggingDemo;
