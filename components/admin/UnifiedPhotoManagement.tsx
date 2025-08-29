'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Baby,
  Church,
  Heart,
  Star,
  Crown,
  Sparkles,
  Camera,
  Package,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoAdmin from './PhotoAdmin';
import { cn } from '@/lib/utils';

interface EventTypeConfig {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: string;
  elements: string[];
  description: string;
}

const EVENT_TYPES: EventTypeConfig[] = [
  {
    id: 'jardin',
    name: 'Jardín de Infantes',
    icon: Baby,
    colors: {
      primary: 'from-pink-400 to-purple-400',
      secondary: 'from-yellow-300 to-orange-400',
      accent: 'bg-rainbow',
      background: 'bg-gradient-to-br from-pink-50 to-purple-50',
      text: 'text-purple-800',
    },
    typography: 'font-comic',
    elements: ['🌈', '⭐', '🎈', '🦄', '🌸'],
    description: 'Ambiente mágico y colorido para los más pequeños',
  },
  {
    id: 'secundaria',
    name: 'Secundaria',
    icon: GraduationCap,
    colors: {
      primary: 'from-slate-600 to-slate-800',
      secondary: 'from-blue-600 to-indigo-700',
      accent: 'bg-gradient-to-r from-slate-500 to-blue-600',
      background: 'bg-gradient-to-br from-slate-50 to-blue-50',
      text: 'text-slate-800',
    },
    typography: 'font-modern',
    elements: ['🎓', '📚', '🏆', '⚡', '🎯'],
    description: 'Diseño moderno y profesional para adolescentes',
  },
  {
    id: 'comunion',
    name: 'Primera Comunión',
    icon: Church,
    colors: {
      primary: 'from-amber-300 to-yellow-400',
      secondary: 'from-white to-gray-100',
      accent: 'bg-gradient-to-r from-amber-400 to-yellow-500',
      background: 'bg-gradient-to-br from-white to-amber-50',
      text: 'text-amber-800',
    },
    typography: 'font-elegant',
    elements: ['✝️', '🕊️', '👼', '💒', '🌟'],
    description: 'Elegancia celestial para una ocasión especial',
  },
];

interface UnifiedPhotoManagementProps {
  eventId?: string;
  initialEventType?: string;
  className?: string;
}

export default function UnifiedPhotoManagement({
  eventId,
  initialEventType = 'secundaria',
  className,
}: UnifiedPhotoManagementProps) {
  const [selectedEventType, setSelectedEventType] =
    useState<string>(initialEventType);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentConfig =
    EVENT_TYPES.find((t) => t.id === selectedEventType) || EVENT_TYPES[1];

  const handleEventTypeChange = (newType: string) => {
    if (newType === selectedEventType) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedEventType(newType);
      setIsTransitioning(false);
    }, 150);
  };

  const getThemeClasses = (config: EventTypeConfig) => {
    return {
      container: cn(
        'min-h-screen transition-all duration-500',
        config.colors.background,
        config.typography
      ),
      header: cn('bg-gradient-to-r p-6 text-white', config.colors.primary),
      card: cn(
        'border-2 shadow-lg transition-all duration-300 hover:shadow-xl',
        config.id === 'jardin' && 'border-pink-300 hover:border-pink-400',
        config.id === 'secundaria' && 'border-slate-300 hover:border-slate-400',
        config.id === 'comunion' && 'border-amber-300 hover:border-amber-400'
      ),
      button: cn(
        'transition-all duration-300',
        config.id === 'jardin' &&
          'bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500',
        config.id === 'secundaria' &&
          'bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700',
        config.id === 'comunion' &&
          'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600'
      ),
    };
  };

  const themeClasses = getThemeClasses(currentConfig);

  return (
    <div className={cn(themeClasses.container, className)}>
      {/* Header con selección de tipo de evento */}
      <motion.div
        className={themeClasses.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <currentConfig.icon className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold">
                  Gestor de Fotos - {currentConfig.name}
                </h1>
                <p className="text-sm text-white/80">
                  {currentConfig.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentConfig.elements.map((element, index) => (
                <motion.span
                  key={element}
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  {element}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Selector de tipo de evento */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {EVENT_TYPES.map((eventType) => {
              const Icon = eventType.icon;
              const isSelected = eventType.id === selectedEventType;

              return (
                <motion.button
                  key={eventType.id}
                  onClick={() => handleEventTypeChange(eventType.id)}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-all duration-300',
                    isSelected
                      ? 'scale-105 border-white bg-white/20 shadow-lg'
                      : 'border-white/30 bg-white/10 hover:bg-white/15'
                  )}
                  whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        isSelected ? 'text-white' : 'text-white/70'
                      )}
                    />
                    <div>
                      <h3
                        className={cn(
                          'font-semibold',
                          isSelected ? 'text-white' : 'text-white/80'
                        )}
                      >
                        {eventType.name}
                      </h3>
                      <p className="text-xs text-white/60">
                        {eventType.elements.join(' ')}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Contenido principal con PhotoAdmin tematizado */}
      <motion.div
        className="container mx-auto p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={themeClasses.card}>
          <CardHeader className={cn('pb-4', currentConfig.colors.text)}>
            <CardTitle className="flex items-center gap-3">
              <Camera className="h-6 w-6" />
              Gestión de Fotografías
              <Badge variant="secondary" className={themeClasses.button}>
                {currentConfig.name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* PhotoAdmin con tema aplicado */}
            <div
              className={cn('photo-admin-themed', `theme-${currentConfig.id}`)}
            >
              <PhotoAdmin
                className="border-none shadow-none"
                enableUpload={true}
                enableBulkOperations={true}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Estilos CSS específicos por tema */}
      <style jsx global>{`
        .theme-jardin {
          --primary-color: #ec4899;
          --secondary-color: #f97316;
          --accent-color: #a855f7;
          --background-color: #fdf2f8;
          --text-color: #7c3aed;
        }

        .theme-secundaria {
          --primary-color: #475569;
          --secondary-color: #2563eb;
          --accent-color: #1e40af;
          --background-color: #f8fafc;
          --text-color: #1e293b;
        }

        .theme-comunion {
          --primary-color: #fbbf24;
          --secondary-color: #f9fafb;
          --accent-color: #f59e0b;
          --background-color: #fffbeb;
          --text-color: #92400e;
        }

        .photo-admin-themed .bg-white {
          background-color: var(--background-color) !important;
        }

        .photo-admin-themed button[variant='default'] {
          background: linear-gradient(
            to right,
            var(--primary-color),
            var(--secondary-color)
          );
        }

        .photo-admin-themed .border-gray-200 {
          border-color: var(--accent-color);
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}
