'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UntaggedPhotos } from './UntaggedPhotos';
import { StudentList } from './StudentList';
import { TaggingPreview } from './TaggingPreview';
import { TaggingStats as StatsComponent } from './TaggingStats';
import { TaggingHelp } from './TaggingHelp';
import { useTaggingShortcuts } from './hooks/useTaggingShortcuts';

export interface Photo {
  id: string;
  storage_path: string;
  width?: number;
  height?: number;
}

export interface Subject {
  id: string;
  first_name: string;
  last_name?: string;
  family_name?: string;
  type: 'student' | 'couple' | 'family';
  photoCount: number;
}

export interface TaggingStats {
  totalPhotos: number;
  taggedPhotos: number;
  untaggedPhotos: number;
  progressPercentage: number;
}

export interface TaggingData {
  stats: TaggingStats;
  untaggedPhotos: Photo[];
  subjects: Subject[];
}

interface PhotoTaggerProps {
  eventId: string;
}

interface PendingAssignment {
  photoIds: string[];
  subjectId: string;
  subjectName: string;
}

export function PhotoTagger({ eventId }: PhotoTaggerProps) {
  const [data, setData] = useState<TaggingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [pendingAssignment, setPendingAssignment] =
    useState<PendingAssignment | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<{
    type: 'tag' | 'untag';
    photoIds: string[];
    subjectId?: string;
  } | null>(null);

  // Cargar datos de tagging
  const loadTaggingData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tagging?eventId=${eventId}`);

      if (!response.ok) {
        throw new Error('Error cargando datos de tagging');
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error cargando datos de tagging:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTaggingData();
  }, [loadTaggingData]);

  // Manejar selección de fotos
  const handlePhotoSelection = (
    photoId: string,
    isSelected: boolean,
    multiSelect = false
  ) => {
    setSelectedPhotos((prev) => {
      if (multiSelect) {
        if (isSelected) {
          return [...prev, photoId];
        } else {
          return prev.filter((id) => id !== photoId);
        }
      } else {
        // Selección simple
        return isSelected ? [photoId] : [];
      }
    });
  };

  // Manejar selección múltiple con Ctrl/Cmd
  const handlePhotoClick = (photoId: string, ctrlKey: boolean) => {
    const isCurrentlySelected = selectedPhotos.includes(photoId);

    if (ctrlKey) {
      // Multi-selección
      handlePhotoSelection(photoId, !isCurrentlySelected, true);
    } else {
      // Selección simple
      if (isCurrentlySelected && selectedPhotos.length === 1) {
        // Deseleccionar si es la única foto seleccionada
        setSelectedPhotos([]);
      } else {
        // Seleccionar solo esta foto
        setSelectedPhotos([photoId]);
      }
    }
  };

  // Iniciar asignación (drag & drop o click en subject)
  const handleStartAssignment = (subjectId: string) => {
    if (selectedPhotos.length === 0) return;

    const subject = data?.subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    const subjectName = getSubjectDisplayName(subject);

    setPendingAssignment({
      photoIds: [...selectedPhotos],
      subjectId,
      subjectName,
    });
  };

  // Confirmar asignación
  const handleConfirmAssignment = async () => {
    if (!pendingAssignment) return;

    try {
      setProcessing(true);

      const response = await fetch('/api/admin/tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: pendingAssignment.photoIds,
          subjectId: pendingAssignment.subjectId,
          eventId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error asignando fotos');
      }

      // Guardar para undo
      setLastAction({
        type: 'tag',
        photoIds: [...pendingAssignment.photoIds],
        subjectId: pendingAssignment.subjectId,
      });

      // Limpiar estados
      setSelectedPhotos([]);
      setPendingAssignment(null);

      // Recargar datos
      await loadTaggingData();
    } catch (error) {
      console.error('Error confirmando asignación:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setProcessing(false);
    }
  };

  // Cancelar asignación pendiente
  const handleCancelAssignment = () => {
    setPendingAssignment(null);
  };

  // Deshacer última acción
  const handleUndo = async () => {
    if (!lastAction) return;

    try {
      setProcessing(true);

      if (lastAction.type === 'tag') {
        // Deshacer asignación
        const response = await fetch('/api/admin/tagging', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoIds: lastAction.photoIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Error deshaciendo asignación');
        }
      }

      setLastAction(null);
      await loadTaggingData();
    } catch (error) {
      console.error('Error deshaciendo acción:', error);
      alert('Error deshaciendo la última acción');
    } finally {
      setProcessing(false);
    }
  };

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedPhotos([]);
  };

  // Seleccionar todas las fotos
  const handleSelectAll = () => {
    if (!data) return;
    const allPhotoIds = data.untaggedPhotos.map((p) => p.id);
    setSelectedPhotos(allPhotoIds);
  };

  // Utilidad para obtener nombre del sujeto
  const getSubjectDisplayName = (subject: Subject): string => {
    switch (subject.type) {
      case 'student':
        return `${subject.first_name} ${subject.last_name || ''}`.trim();
      case 'couple':
        return `${subject.first_name} ${subject.last_name || ''}`.trim();
      case 'family':
        return subject.family_name || `Familia ${subject.first_name}`;
      default:
        return subject.first_name;
    }
  };

  // Manejar shortcuts de teclado con hook personalizado
  useTaggingShortcuts({
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
    onUndo: handleUndo,
    onCancel: handleCancelAssignment,
    canUndo: !!lastAction,
    hasPendingAssignment: !!pendingAssignment,
    hasSelection: selectedPhotos.length > 0,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
        <span className="text-foreground ml-3">
          Cargando datos de tagging...
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Error cargando datos de tagging</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas mejoradas */}
      <StatsComponent
        stats={data.stats}
        selectedCount={selectedPhotos.length}
      />

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-muted-foreground">
          {selectedPhotos.length > 0 && (
            <span>
              {selectedPhotos.length} foto
              {selectedPhotos.length !== 1 ? 's' : ''} seleccionada
              {selectedPhotos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex gap-2">
          {selectedPhotos.length > 0 && (
            <button
              onClick={handleClearSelection}
              className="text-foreground rounded-lg bg-gray-500/20 px-4 py-2 transition-colors hover:bg-gray-500/30"
            >
              Limpiar Selección
            </button>
          )}

          {data.untaggedPhotos.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-foreground rounded-lg bg-blue-500/20 px-4 py-2 transition-colors hover:bg-blue-500/30"
            >
              Seleccionar Todo
            </button>
          )}

          {lastAction && (
            <button
              onClick={handleUndo}
              disabled={processing}
              className="text-foreground rounded-lg bg-yellow-500/20 px-4 py-2 transition-colors hover:bg-yellow-500/30 disabled:opacity-50"
            >
              Deshacer (Ctrl+Z)
            </button>
          )}
        </div>
      </div>

      {/* Preview de asignación pendiente */}
      {pendingAssignment && (
        <TaggingPreview
          assignment={pendingAssignment}
          onConfirm={handleConfirmAssignment}
          onCancel={handleCancelAssignment}
          processing={processing}
        />
      )}

      {/* Contenido principal: Side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lado izquierdo: Fotos sin asignar */}
        <div className="space-y-4">
          <h2 className="text-foreground flex items-center text-xl font-semibold">
            <span className="mr-3 h-3 w-3 rounded-full bg-orange-400"></span>
            Fotos Sin Asignar ({data.untaggedPhotos.length})
          </h2>

          <UntaggedPhotos
            photos={data.untaggedPhotos}
            selectedPhotos={selectedPhotos}
            onPhotoClick={handlePhotoClick}
            loading={processing}
          />
        </div>

        {/* Lado derecho: Lista de alumnos */}
        <div className="space-y-4">
          <h2 className="text-foreground flex items-center text-xl font-semibold">
            <span className="mr-3 h-3 w-3 rounded-full bg-green-400"></span>
            Alumnos ({data.subjects.length})
          </h2>

          <StudentList
            subjects={data.subjects}
            selectedPhotosCount={selectedPhotos.length}
            onSubjectSelect={handleStartAssignment}
            getSubjectDisplayName={getSubjectDisplayName}
            disabled={processing || selectedPhotos.length === 0}
          />
        </div>
      </div>

      {/* Instrucciones */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 backdrop-blur-sm">
        <h3 className="text-foreground mb-2 font-medium">Instrucciones:</h3>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>
            • Click en fotos para seleccionar (Ctrl/Cmd + Click para selección
            múltiple)
          </li>
          <li>• Click en alumno para asignar fotos seleccionadas</li>
          <li>
            • Usa Ctrl+A para seleccionar todas, Esc para limpiar selección
          </li>
          <li>• Ctrl+Z para deshacer la última acción</li>
        </ul>
      </div>

      {/* Componente de ayuda flotante */}
      <TaggingHelp />
    </div>
  );
}
