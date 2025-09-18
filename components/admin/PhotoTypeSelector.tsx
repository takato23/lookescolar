'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Camera, Globe } from 'lucide-react';

export type PhotoType = 'private' | 'public' | 'classroom';

export interface PhotoTypeSelectorProps {
  selectedType: PhotoType;
  onTypeChange: (type: PhotoType) => void;
  compact?: boolean;
  className?: string;
}

const photoTypes = [
  {
    type: 'private' as PhotoType,
    icon: Camera,
    title: 'Fotos Familiares',
    description: 'Fotos individuales o de familia',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    buttonColor: 'hover:bg-blue-50 hover:border-blue-300',
    selectedColor: 'bg-blue-50 text-blue-900 border-blue-300',
    emoji: '👨‍👩‍👧‍👦',
  },
  {
    type: 'classroom' as PhotoType,
    icon: Users,
    title: 'Fotos del Salón',
    description: 'Fotos grupales de toda la clase',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    buttonColor: 'hover:bg-purple-50 hover:border-purple-300',
    selectedColor: 'bg-purple-50 text-purple-900 border-purple-300',
    emoji: '🏫',
  },
  {
    type: 'public' as PhotoType,
    icon: Globe,
    title: 'Fotos Públicas',
    description: 'Fotos visibles para todos',
    badgeColor: 'bg-green-50 text-green-700 border-green-200',
    buttonColor: 'hover:bg-green-50 hover:border-green-300',
    selectedColor: 'bg-green-50 text-green-900 border-green-300',
    emoji: '🌍',
  },
];

export function PhotoTypeSelector({
  selectedType,
  onTypeChange,
  compact = false,
  className = '',
}: PhotoTypeSelectorProps) {
  if (compact) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {photoTypes.map(({ type, title, emoji, badgeColor, selectedColor }) => (
          <Button
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange(type)}
            className={` ${selectedType === type ? selectedColor : 'hover:bg-muted'} transition-all duration-200`}
          >
            <span className="mr-1">{emoji}</span>
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{title.split(' ')[1]}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h4 className="text-sm font-semibold text-foreground">Tipo de Fotos</h4>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {photoTypes.map(
          ({
            type,
            icon: Icon,
            title,
            description,
            badgeColor,
            buttonColor,
            selectedColor,
            emoji,
          }) => (
            <Card
              key={type}
              className={`cursor-pointer border-2 transition-all duration-200 ${
                selectedType === type
                  ? selectedColor
                  : `hover:shadow-md ${buttonColor} border-border`
              } `}
              onClick={() => onTypeChange(type)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold">{title}</h5>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                      {description}
                    </p>
                  </div>
                  {selectedType === type && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${badgeColor}`}
                    >
                      ✓ Seleccionado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Info Panel */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
            <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-200">
              <span className="text-[10px]">ℹ</span>
            </div>
            <div>
              {selectedType === 'private' && (
                <>
                  <strong>Fotos Familiares:</strong> Se asignan a familias
                  específicas y solo son visibles en sus galerías privadas con
                  token.
                </>
              )}
              {selectedType === 'classroom' && (
                <>
                  <strong>Fotos del Salón:</strong> Fotos grupales que pueden
                  compartirse públicamente o usarse para promoción del evento.
                </>
              )}
              {selectedType === 'public' && (
                <>
                  <strong>Fotos Públicas:</strong> Visibles en la galería
                  pública del evento sin restricciones.
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
