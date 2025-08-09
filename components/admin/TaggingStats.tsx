'use client';

import React from 'react';
import { TaggingStats as Stats } from './PhotoTagger';

interface TaggingStatsProps {
  stats: Stats;
  selectedCount?: number;
  className?: string;
}

export function TaggingStats({
  stats,
  selectedCount = 0,
  className = '',
}: TaggingStatsProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'from-red-500 to-red-600';
    if (percentage < 70) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-green-600';
  };

  const estimatedTimeRemaining = () => {
    if (stats.untaggedPhotos === 0) return null;

    // Estimar ~5 segundos por foto (incluyendo selección y asignación)
    const avgTimePerPhoto = 5; // segundos
    const totalSeconds = stats.untaggedPhotos * avgTimePerPhoto;

    if (totalSeconds < 60) {
      return `~${totalSeconds}s restantes`;
    } else if (totalSeconds < 3600) {
      const minutes = Math.ceil(totalSeconds / 60);
      return `~${minutes}min restantes`;
    } else {
      const hours = Math.ceil(totalSeconds / 3600);
      return `~${hours}h restantes`;
    }
  };

  const timeRemaining = estimatedTimeRemaining();

  return (
    <div
      className={`rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm ${className}`}
    >
      {/* Grid de estadísticas principales */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats.totalPhotos}
          </div>
          <div className="text-sm text-white/70">Total Fotos</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {stats.taggedPhotos}
          </div>
          <div className="text-sm text-white/70">Asignadas</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">
            {stats.untaggedPhotos}
          </div>
          <div className="text-sm text-white/70">Sin Asignar</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {stats.progressPercentage}%
          </div>
          <div className="text-sm text-white/70">Progreso</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white/70">
            Progreso de Asignación
          </span>
          {timeRemaining && (
            <span className="text-xs text-white/50">{timeRemaining}</span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className={`bg-gradient-to-r ${getProgressColor(stats.progressPercentage)} h-3 rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Estado actual */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-white/70">
          {selectedCount > 0 ? (
            <span className="text-blue-400">
              {selectedCount} foto{selectedCount !== 1 ? 's' : ''} seleccionada
              {selectedCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>Selecciona fotos para comenzar</span>
          )}
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center space-x-2">
          {stats.progressPercentage === 100 ? (
            <div className="flex items-center text-green-400">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
              <span className="text-xs font-medium">Completado</span>
            </div>
          ) : selectedCount > 0 ? (
            <div className="flex items-center text-blue-400">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
              <span className="text-xs font-medium">Listo para asignar</span>
            </div>
          ) : (
            <div className="flex items-center text-white/50">
              <span className="mr-2 h-2 w-2 rounded-full bg-white/50"></span>
              <span className="text-xs">En espera</span>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de finalización */}
      {stats.progressPercentage === 100 && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/20 p-3">
          <div className="flex items-center">
            <span className="mr-2 text-lg text-green-400">🎉</span>
            <div>
              <div className="text-sm font-medium text-green-400">
                ¡Tagging completado!
              </div>
              <div className="text-xs text-green-400/70">
                Todas las fotos han sido asignadas correctamente.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
