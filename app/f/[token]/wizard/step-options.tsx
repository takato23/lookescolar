'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, ImageIcon } from 'lucide-react';
import {
  useWizardStore,
  BASE_OPTIONS,
  WizardOption,
} from '@/lib/stores/wizard-store';
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
    setImageErrors((prev) => ({ ...prev, [optionId]: true }));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Elige tu paquete de fotos
        </h1>
        <p className="text-lg text-gray-600">
          Selecciona la opción que mejor se adapte a lo que necesitas
        </p>
      </div>

      {/* Options Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {BASE_OPTIONS.map((option) => {
          const isSelected = selectedOption?.id === option.id;
          const hasImageError = imageErrors[option.id];

          return (
            <div
              key={option.id}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
              }`}
              onClick={() => handleSelectOption(option)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute right-4 top-4 z-20">
                  <div className="rounded-full bg-purple-500 p-2 text-white">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                </div>
              )}

              {/* Mockup Image */}
              <div className="relative aspect-video bg-gray-100">
                {hasImageError ? (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                    <div className="text-center">
                      <ImageIcon className="mx-auto mb-2 h-16 w-16 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Vista previa del producto
                      </p>
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
                <div className="absolute left-4 top-4">
                  <div className="rounded-full bg-black/80 px-3 py-1 text-sm font-medium text-white">
                    {option.photos} foto{option.photos > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {option.name}
                </h3>
                <p className="mb-4 text-gray-600">{option.description}</p>

                {/* Features */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span>Impresión de alta calidad</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span>Entrega en carpeta personalizada</span>
                  </div>
                  {option.photos > 1 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span>Puedes repetir la misma foto</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(option.price)}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
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
        <div className="mb-8 rounded-xl border border-purple-200 bg-purple-50 p-6">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-purple-500 p-2 text-white">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-gray-900">
                Has seleccionado: {selectedOption.name}
              </h3>
              <p className="mb-2 text-gray-600">{selectedOption.description}</p>
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
          className={`rounded-xl px-8 py-3 text-lg font-semibold transition-all ${
            selectedOption
              ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700 hover:shadow-xl'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {selectedOption
            ? 'Continuar a selección de fotos'
            : 'Selecciona una opción para continuar'}
        </button>
      </div>
    </div>
  );
}
