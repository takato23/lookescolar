'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  CheckCircleIcon,
  XIcon,
  ImageIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { useWizardStore } from '@/lib/stores/wizard-store';
import {
  validatePhotoSelection,
  getSelectionInstructions,
  getPackageById,
} from '@/lib/pricing';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface StepSelectionProps {
  photos: Photo[];
  onNext: () => void;
  onPrev: () => void;
  loading?: boolean;
}

export default function StepSelection({
  photos,
  onNext,
  onPrev,
  loading = false,
}: StepSelectionProps) {
  const { 
    selectedOption, 
    selectedPhotos, 
    selectedPhotosLegacy,
    toggleIndividualPhoto,
    toggleGroupPhoto 
  } = useWizardStore();
  const [zoomPhoto, setZoomPhoto] = useState<Photo | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');

  // Map WizardOption (id: 1|2) to PackageOption ('option-a'|'option-b') for validation
  const selectedPackage = selectedOption
    ? getPackageById(selectedOption.id === 1 ? 'option-a' : 'option-b')
    : null;

  // Validate selection using PackageOption-aware helpers
  const validation = validatePhotoSelection(selectedPhotos, selectedPackage);
  const instructions = getSelectionInstructions(selectedPackage, selectedPhotos);

  // Count occurrences of each photo using legacy format for UI display
  const allSelectedPhotos = [...selectedPhotos.individual, ...selectedPhotos.group];
  const photoCounts = allSelectedPhotos.reduce(
    (counts, photoId) => {
      counts[photoId] = (counts[photoId] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  const handlePhotoClick = (photo: Photo) => {
    if (!selectedOption) return;

    const isIndividualPhoto = activeTab === 'individual';
    const maxIndividual = selectedOption.id === 1 ? 1 : 2; // Option A: 1, Option B: 2
    const maxGroup = 1; // Always 1 group photo
    
    if (isIndividualPhoto) {
      // Handle individual photo selection
      const isCurrentlySelected = selectedPhotos.individual.includes(photo.id);
      if (isCurrentlySelected) {
        toggleIndividualPhoto(photo.id); // Toggle off
      } else if (selectedPhotos.individual.length < maxIndividual) {
        toggleIndividualPhoto(photo.id); // Add if under limit
      }
    } else {
      // Handle group photo selection
      const isCurrentlySelected = selectedPhotos.group.includes(photo.id);
      if (isCurrentlySelected) {
        toggleGroupPhoto(photo.id); // Toggle off
      } else if (selectedPhotos.group.length < maxGroup) {
        toggleGroupPhoto(photo.id); // Add if under limit
      }
    }
  };

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="animate-pulse">
            <div className="mx-auto mb-4 h-8 w-64 rounded bg-gray-200"></div>
            <div className="mx-auto h-4 w-96 rounded bg-gray-200"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-lg bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Selecciona tus fotos
        </h1>
        <p className="text-lg text-gray-600">
          {selectedOption?.name} - {instructions.overall}
        </p>
      </div>

      {/* Selection Status */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                validation.isValid ? 'bg-green-100' : 'bg-yellow-100'
              }`}
            >
              {validation.isValid ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <ImageIcon className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {validation.individual.selected} individual{validation.individual.selected > 1 ? 'es' : ''} + {validation.group.selected} grupal{validation.group.selected > 1 ? 'es' : ''}
              </h3>
              <p className="text-sm text-gray-600">
                {validation.individual.message}
              </p>
              {validation.group.message && (
                <p className="text-sm text-gray-600">
                  {validation.group.message}
                </p>
              )}
            </div>
          </div>

          {/* Selected Photos Preview */}
          {allSelectedPhotos.length > 0 && (
            <div className="flex space-x-2">
              {Object.entries(photoCounts).map(([photoId, count]) => {
                const photo = photos.find((p) => p.id === photoId);
                if (!photo) return null;

                return (
                  <div key={photoId} className="relative">
                    <div className="h-16 w-16 overflow-hidden rounded-lg border-2 border-purple-500">
                      <Image
                        src={photo.preview_url}
                        alt={photo.filename}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </div>
                    {count > 1 && (
                      <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Photo Type Selector */}
      <div className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'individual'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Fotos Individuales
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {selectedPhotos.individual.length}/{selectedOption?.id === 1 ? 1 : 2}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'group'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Foto Grupal
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {selectedPhotos.group.length}/1
          </span>
        </button>
      </div>

      {/* Tab Content Instructions */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-900">
          {activeTab === 'individual' ? 'Selecciona fotos individuales' : 'Selecciona la foto grupal'}
        </h3>
        <p className="text-sm text-gray-600">
          {activeTab === 'individual'
            ? `Necesitas seleccionar ${selectedOption?.id === 1 ? '1 foto individual' : '2 fotos individuales'} para este paquete.`
            : 'Selecciona 1 foto grupal para completar tu paquete.'}
        </p>
      </div>

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="py-12 text-center">
          <AlertCircleIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No hay fotos disponibles
          </h3>
          <p className="text-gray-600">
            No se encontraron fotos para mostrar en esta galería.
          </p>
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo) => {
            const isIndividualSelected = selectedPhotos.individual.includes(photo.id);
            const isGroupSelected = selectedPhotos.group.includes(photo.id);
            const isSelectedInCurrentTab = activeTab === 'individual' ? isIndividualSelected : isGroupSelected;
            const maxForCurrentTab = activeTab === 'individual' 
              ? (selectedOption?.id === 1 ? 1 : 2) 
              : 1;
            const currentTabSelectionCount = activeTab === 'individual' 
              ? selectedPhotos.individual.length 
              : selectedPhotos.group.length;
            const canSelectInCurrentTab = !isSelectedInCurrentTab && currentTabSelectionCount < maxForCurrentTab;

            return (
              <div
                key={photo.id}
                className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl transition-all duration-200 ${
                  isSelectedInCurrentTab
                    ? 'shadow-lg ring-4 ring-purple-500'
                    : canSelectInCurrentTab
                      ? 'hover:shadow-md hover:ring-2 hover:ring-gray-300'
                      : 'cursor-not-allowed opacity-50'
                }`}
                onClick={() => handlePhotoClick(photo)}
              >
                {/* Photo */}
                <Image
                  src={photo.preview_url}
                  alt={photo.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />

                {/* Overlay */}
                <div
                  className={`absolute inset-0 transition-all ${
                    isSelectedInCurrentTab
                      ? 'bg-purple-500/20'
                      : canSelectInCurrentTab
                        ? 'bg-black/0 hover:bg-black/10'
                        : 'bg-gray-500/40'
                  }`}
                />

                {/* Selection Indicator */}
                <div className="absolute right-2 top-2">
                  {isSelectedInCurrentTab ? (
                    <div className="rounded-full bg-purple-500 p-1 text-white">
                      <CheckCircleIcon className="h-5 w-5" />
                    </div>
                  ) : canSelectInCurrentTab ? (
                    <div className="rounded-full bg-white/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                    </div>
                  ) : null}
                </div>

                {/* Selected in other tab indicator */}
                {!isSelectedInCurrentTab && ((activeTab === 'individual' && isGroupSelected) || (activeTab === 'group' && isIndividualSelected)) && (
                  <div className="absolute left-2 top-2 rounded-full bg-blue-500 p-1 text-white">
                    <CheckCircleIcon className="h-4 w-4" />
                  </div>
                )}

                {/* Photo Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="truncate text-xs font-medium text-white">
                    {photo.filename}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          ← Cambiar opción
        </button>

        <button
          onClick={onNext}
          disabled={!validation.isValid}
          className={`rounded-xl px-8 py-3 font-semibold transition-all ${
            validation.isValid
              ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700 hover:shadow-xl'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {validation.isValid
            ? 'Continuar a extras'
            : (validation.overall?.message || 'Completa la selección de fotos')}
        </button>
      </div>

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-h-full max-w-4xl">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            >
              <XIcon className="h-6 w-6" />
            </button>
            <Image
              src={zoomPhoto.preview_url}
              alt={zoomPhoto.filename}
              width={zoomPhoto.width}
              height={zoomPhoto.height}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
