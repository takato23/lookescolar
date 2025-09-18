'use client';

import React, { useState, useMemo } from 'react';
import { Subject } from './PhotoTagger';

interface StudentListProps {
  subjects: Subject[];
  selectedPhotosCount: number;
  onSubjectSelect: (subjectId: string) => void;
  getSubjectDisplayName: (subject: Subject) => string;
  disabled?: boolean;
}

export function StudentList({
  subjects,
  selectedPhotosCount,
  onSubjectSelect,
  getSubjectDisplayName,
  disabled = false,
}: StudentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<
    'all' | 'student' | 'couple' | 'family'
  >('all');

  // Filtrar sujetos basado en búsqueda y tipo
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch =
        searchQuery === '' ||
        getSubjectDisplayName(subject)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        subject.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subject.last_name &&
          subject.last_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (subject.family_name &&
          subject.family_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedType === 'all' || subject.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [subjects, searchQuery, selectedType, getSubjectDisplayName]);

  // Estadísticas por tipo
  const typeStats = useMemo(() => {
    const stats = {
      all: subjects.length,
      student: subjects.filter((s) => s.type === 'student').length,
      couple: subjects.filter((s) => s.type === 'couple').length,
      family: subjects.filter((s) => s.type === 'family').length,
    };
    return stats;
  }, [subjects]);

  const handleSubjectClick = (subjectId: string) => {
    if (disabled || selectedPhotosCount === 0) return;
    onSubjectSelect(subjectId);
  };

  const getTypeIcon = (type: Subject['type']) => {
    switch (type) {
      case 'student':
        return '🎓';
      case 'couple':
        return '💑';
      case 'family':
        return '👨‍👩‍👧‍👦';
      default:
        return '👤';
    }
  };

  const getTypeLabel = (type: Subject['type']) => {
    switch (type) {
      case 'student':
        return 'Estudiante';
      case 'couple':
        return 'Pareja';
      case 'family':
        return 'Familia';
      default:
        return 'Desconocido';
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20">
            <span className="text-2xl text-primary-400">👥</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            No hay sujetos en este evento
          </h3>
          <p className="text-white/70">
            Agrega alumnos o familias para comenzar el tagging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      {/* Header con búsqueda */}
      <div className="mb-4 space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 transform">
            <span className="text-white/50">🔍</span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-white/50 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros por tipo */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'student', 'couple', 'family'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-400 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              } `}
            >
              {type === 'all'
                ? '👥 Todos'
                : `${getTypeIcon(type)} ${getTypeLabel(type)}`}
              <span className="ml-1 text-xs opacity-75">
                ({typeStats[type]})
              </span>
            </button>
          ))}
        </div>

        {/* Info de selección */}
        <div className="text-center text-sm">
          {selectedPhotosCount > 0 ? (
            <span className="text-blue-400">
              Click en un alumno para asignar {selectedPhotosCount} foto
              {selectedPhotosCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-white/50">
              Selecciona fotos primero para habilitar la asignación
            </span>
          )}
        </div>
      </div>

      {/* Lista de sujetos */}
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {filteredSubjects.length === 0 ? (
          <div className="py-8 text-center text-white/50">
            <span className="mb-2 block text-2xl">🔍</span>
            No se encontraron resultados
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleSubjectClick(subject.id)}
              className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all duration-200 ${
                disabled || selectedPhotosCount === 0
                  ? 'cursor-not-allowed bg-white/5 opacity-50'
                  : 'hover:scale-102 bg-white/10 hover:bg-white/20'
              } `}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar/Icono */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 font-bold text-white">
                  {getTypeIcon(subject.type)}
                </div>

                {/* Información del sujeto */}
                <div>
                  <div className="font-medium text-white">
                    {getSubjectDisplayName(subject)}
                  </div>
                  <div className="text-sm text-white/50">
                    {getTypeLabel(subject.type)}
                  </div>
                </div>
              </div>

              {/* Contador de fotos y indicador */}
              <div className="flex items-center space-x-2">
                {/* Contador de fotos asignadas */}
                {subject.photoCount > 0 && (
                  <div className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                    {subject.photoCount} foto
                    {subject.photoCount !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Indicador de estado */}
                <div
                  className={`h-3 w-3 rounded-full ${
                    subject.photoCount > 0 ? 'bg-green-400' : 'bg-primary-400'
                  }`}
                />

                {/* Flecha indicadora */}
                {selectedPhotosCount > 0 && !disabled && (
                  <span className="text-white/70">→</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="text-center text-sm text-white/70">
          {filteredSubjects.length} de {subjects.length} alumnos
          {searchQuery && ` • Filtro: "${searchQuery}"`}
        </div>
      </div>
    </div>
  );
}
