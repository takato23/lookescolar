'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, ImageIcon } from 'lucide-react';
import { useWizardStore, BASE_OPTIONS, WizardOption } from '@/lib/stores/wizard-store';
import { formatPrice } from '@/lib/pricing';

interface StepOptionsProps {
  onNext: () => void;
}

export default function StepOptions({ onNext }: StepOptionsProps) {
  const { selectedOption, selectOption } = useWizardStore();
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const handleSelectOption = (option: WizardOption) => {
    selectOption(option);
  };

  const handleImageError = (optionId: number) => {
    setImageErrors(prev => ({ ...prev, [optionId]: true }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Elige tu paquete de fotos
        </h1>
        <p className="text-lg text-gray-600">
          Selecciona la opción que mejor se adapte a lo que necesitas
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {BASE_OPTIONS.map((option) => {
          const isSelected = selectedOption?.id === option.id;
          const hasImageError = imageErrors[option.id];
          
          return (
            <div
              key={option.id}
              className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
              }`}
              onClick={() => handleSelectOption(option)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="bg-purple-500 text-white rounded-full p-2">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                </div>
              )}

              {/* Mockup Image */}
              <div className="aspect-video relative bg-gray-100">
                {hasImageError ? (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-100 to-pink-100">
                    <div className="text-center">
                      <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Vista previa del producto</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={option.mockupUrl}
                    alt={`Mockup ${option.name}`}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(option.id)}
                  />
                )}
                
                {/* Photo Count Badge */}
                <div className="absolute top-4 left-4">
                  <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {option.photos} foto{option.photos > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {option.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {option.description}
                </p>
                
                {/* Features */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Impresión de alta calidad</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Entrega en carpeta personalizada</span>
                  </div>
                  {option.photos > 1 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Puedes repetir la misma foto</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(option.price)}
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSelected
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSelected ? 'Seleccionado' : 'Seleccionar'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedOption && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-purple-500 text-white rounded-full p-2">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Has seleccionado: {selectedOption.name}
              </h3>
              <p className="text-gray-600 mb-2">
                {selectedOption.description}
              </p>
              <div className="text-lg font-semibold text-purple-600">
                {formatPrice(selectedOption.price)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center">
        <button
          onClick={onNext}
          disabled={!selectedOption}
          className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all ${
            selectedOption
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedOption ? 'Continuar a selección de fotos' : 'Selecciona una opción para continuar'}
        </button>
      </div>
    </div>
  );
}