'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Package,
  Image,
  Users,
  Sparkles,
  Star,
  ArrowRight,
  Camera,
  Heart,
  Palette,
  Sun,
  Cloud,
  Rocket,
} from 'lucide-react';
import { ProductOption } from '@/lib/types/unified-store';
import { formatCurrency } from '@/lib/utils';

interface FolderSelectorProps {
  options: ProductOption[];
  selectedOption: ProductOption | null;
  onSelect: (option: ProductOption) => void;
  className?: string;
}

export function FolderSelector({ 
  options, 
  selectedOption, 
  onSelect,
  className 
}: FolderSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header con diseño divertido */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="h-5 w-5 text-yellow-500 animate-pulse" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Elegí tu Carpeta de Fotos
          </h2>
          <Star className="h-5 w-5 text-yellow-500 animate-pulse" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Seleccioná la opción perfecta para guardar tus recuerdos escolares
        </p>
      </div>

      {/* Opciones de carpetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {options.map((option) => {
          const isSelected = selectedOption?.id === option.id;
          const isHovered = hoveredOption === option.id;
          
          return (
            <Card
              key={option.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 cursor-pointer",
                "hover:shadow-xl hover:scale-[1.02]",
                isSelected && "ring-2 ring-primary ring-offset-2"
              )}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
              onClick={() => onSelect(option)}
            >
              {/* Badge de selección */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-primary text-primary-foreground">
                    <Check className="h-3 w-3 mr-1" />
                    Seleccionada
                  </Badge>
                </div>
              )}

              {/* Decoración visual de la carpeta */}
              <div className="relative h-48 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
                {/* Elementos decorativos estilo Look Escolar */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Sol */}
                  <Sun className="absolute top-4 left-4 h-8 w-8 text-yellow-400 opacity-60" />
                  
                  {/* Nubes */}
                  <Cloud className="absolute top-8 right-8 h-6 w-6 text-blue-300 opacity-50" />
                  <Cloud className="absolute top-16 right-20 h-5 w-5 text-blue-300 opacity-40" />
                  
                  {/* Cohete */}
                  <Rocket className="absolute bottom-8 left-8 h-10 w-10 text-purple-400 opacity-50 rotate-45" />
                  
                  {/* Corazones */}
                  <Heart className="absolute bottom-12 right-12 h-5 w-5 text-pink-400 opacity-40" />
                  <Heart className="absolute top-20 left-20 h-4 w-4 text-pink-300 opacity-30" />
                </div>

                {/* Contenido central */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <div className="bg-white/90 dark:bg-gray-900/90 rounded-xl p-6 shadow-lg">
                    <Package className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-center">
                      {option.name}
                    </h3>
                    <div className="text-2xl font-bold text-primary text-center mt-2">
                      {formatCurrency(option.basePrice)}
                    </div>
                  </div>
                </div>

                {/* Efecto hover */}
                {isHovered && (
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent animate-pulse" />
                )}
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Descripción */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>

                {/* Contenido de la carpeta */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Palette className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Carpeta de {option.contents.folderSize}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>
                      {option.contents.individualPhotos} foto{option.contents.individualPhotos > 1 ? 's' : ''} individual{option.contents.individualPhotos > 1 ? 'es' : ''} ({option.contents.individualSize})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30">
                      <Camera className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <span>
                      {option.contents.smallPhotos} fotitos ({option.contents.smallSize})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span>
                      {option.contents.groupPhotos} foto grupal ({option.contents.groupSize})
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="pt-3 border-t space-y-2">
                  {option.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Sparkles className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Botón de selección */}
                <Button
                  className={cn(
                    "w-full",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  variant={isSelected ? "default" : "outline"}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Carpeta Seleccionada
                    </>
                  ) : (
                    <>
                      Seleccionar Esta Carpeta
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Nota informativa */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">¡Con tu compra podés agregar copias extras!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Una vez que elijas tu carpeta, podrás agregar copias adicionales de distintos tamaños de cualquier foto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}