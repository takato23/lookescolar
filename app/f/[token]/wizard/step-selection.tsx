'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, XIcon, ImageIcon, AlertCircleIcon } from 'lucide-react';
import { useWizardStore } from '@/lib/stores/wizard-store';
import { validatePhotoSelection, getSelectionInstructions } from '@/lib/pricing';

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

export default function StepSelection({ photos, onNext, onPrev, loading = false }: StepSelectionProps) {
  const { selectedOption, selectedPhotos, togglePhoto } = useWizardStore();
  const [zoomPhoto, setZoomPhoto] = useState<Photo | null>(null);
  
  // Validate selection
  const validation = validatePhotoSelection(selectedPhotos, selectedOption);
  const instructions = getSelectionInstructions(selectedOption, selectedPhotos);
  
  // Count occurrences of each photo
  const photoCounts = selectedPhotos.reduce((counts, photoId) => {
    counts[photoId] = (counts[photoId] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const handlePhotoClick = (photo: Photo) => {
    if (!selectedOption) return;
    
    const currentCount = photoCounts[photo.id] || 0;
    const totalSelected = selectedPhotos.length;
    const maxPhotos = selectedOption.photos;
    
    // If photo is not selected and we haven't reached the limit, select it
    if (currentCount === 0 && totalSelected < maxPhotos) {
      togglePhoto(photo.id);
    }
    // If photo is selected and we can repeat (Option 2), add another
    else if (currentCount > 0 && selectedOption.photos > 1 && totalSelected < maxPhotos) {
      togglePhoto(photo.id);
    }
    // If photo is selected, deselect one occurrence
    else if (currentCount > 0) {
      togglePhoto(photo.id);
    }
  };

  const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Selecciona tus fotos
        </h1>
        <p className="text-lg text-gray-600">
          {selectedOption?.name} - {instructions}
        </p>
      </div>

      {/* Selection Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
              validation.isValid ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {validation.isValid ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <ImageIcon className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {validation.selected} de {validation.required} foto{validation.required > 1 ? 's' : ''} seleccionada{validation.selected > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600">
                {validation.message}
              </p>
              {validation.canRepeat && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Puedes seleccionar la misma foto varias veces
                </p>
              )}
            </div>
          </div>
          
          {/* Selected Photos Preview */}
          {selectedPhotos.length > 0 && (
            <div className="flex space-x-2">
              {Object.entries(photoCounts).map(([photoId, count]) => {
                const photo = photos.find(p => p.id === photoId);
                if (!photo) return null;
                
                return (
                  <div key={photoId} className="relative">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-500">
                      <Image
                        src={photo.preview_url}
                        alt={photo.filename}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </div>
                    {count > 1 && (
                      <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
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

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fotos disponibles</h3>
          <p className="text-gray-600">No se encontraron fotos para mostrar en esta galería.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mb-8">
          {photos.map((photo) => {
            const count = photoCounts[photo.id] || 0;
            const isSelected = count > 0;
            const canSelect = selectedPhotos.length < (selectedOption?.photos || 0);
            const canAddMore = isSelected && selectedOption?.photos > 1 && canSelect;
            
            return (
              <div
                key={photo.id}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-4 ring-purple-500 shadow-lg'
                    : canSelect
                    ? 'hover:ring-2 hover:ring-gray-300 hover:shadow-md'
                    : 'opacity-50 cursor-not-allowed'
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
                <div className={`absolute inset-0 transition-all ${
                  isSelected
                    ? 'bg-purple-500/20'
                    : canSelect
                    ? 'bg-black/0 hover:bg-black/10'
                    : 'bg-gray-500/40'
                }`} />
                
                {/* Selection Indicator */}
                <div className="absolute top-2 right-2">
                  {isSelected ? (
                    <div className="bg-purple-500 text-white rounded-full p-1">
                      <CheckCircleIcon className="h-5 w-5" />
                    </div>
                  ) : canSelect ? (
                    <div className="bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                    </div>
                  ) : null}
                </div>
                
                {/* Count Badge */}
                {count > 1 && (
                  <div className="absolute top-2 left-2 bg-purple-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                    {count}
                  </div>
                )}
                
                {/* Plus indicator for repeatable photos */}
                {canAddMore && (
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    +
                  </div>
                )}
                
                {/* Photo Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.filename}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          ← Cambiar opción
        </button>
        
        <button
          onClick={onNext}
          disabled={!validation.isValid}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            validation.isValid
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {validation.isValid ? 'Continuar a extras' : `Selecciona ${validation.required - validation.selected} foto${validation.required - validation.selected > 1 ? 's' : ''} más`}
        </button>
      </div>

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomPhoto(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors z-10"
            >
              <XIcon className="h-6 w-6" />
            </button>
            <Image
              src={zoomPhoto.preview_url}
              alt={zoomPhoto.filename}
              width={zoomPhoto.width}
              height={zoomPhoto.height}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}