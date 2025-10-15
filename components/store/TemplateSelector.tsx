'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Palette,
  Sparkles,
  Camera,
  Crown,
  Eye,
  Zap,
  Award,
  Settings,
  Monitor,
  Smartphone,
  Layout,
  Image
} from 'lucide-react';

export type TemplateType = 'modern-minimal' | 'bold-vibrant' | 'premium-photography' | 'pixieset' | 'editorial' | 'minimal';

interface TemplateInfo {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  preview: string;
  features: string[];
  style: 'minimal' | 'vibrant' | 'premium' | 'classic';
  colorScheme: string;
  recommended?: boolean;
  new?: boolean;
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Diseño limpio y elegante con mucho espacio en blanco y sombras sutiles',
    icon: Layout,
    preview: '/templates/modern-minimal-preview.jpg',
    features: [
      'Diseño minimalista y limpio',
      'Espacios en blanco generosos',
      'Sombras sutiles y elegantes',
      'Tipografía moderna',
      'Interfaz intuitiva',
      'Optimizado para móviles'
    ],
    style: 'minimal',
    colorScheme: 'bg-gradient-to-br from-gray-50 to-gray-100',
    new: true
  },
  {
    id: 'bold-vibrant',
    name: 'Bold & Vibrant',
    description: 'Diseño colorido y energético con gradientes, tipografía audaz y elementos dinámicos',
    icon: Zap,
    preview: '/templates/bold-vibrant-preview.jpg',
    features: [
      'Colores vibrantes y gradientes',
      'Tipografía audaz y llamativa',
      'Elementos dinámicos animados',
      'Interfaz energética',
      'Iconos coloridos',
      'Experiencia visual impactante'
    ],
    style: 'vibrant',
    colorScheme: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    recommended: true,
    new: true
  },
  {
    id: 'premium-photography',
    name: 'Premium Photography',
    description: 'Estilo de portafolio fotográfico de alta gama con modo oscuro y diseño sofisticado',
    icon: Crown,
    preview: '/templates/premium-photography-preview.jpg',
    features: [
      'Modo oscuro sofisticado',
      'Estilo portafolio profesional',
      'Efectos cinematográficos',
      'Diseño de lujo',
      'Vista mosaico avanzada',
      'Experiencia premium'
    ],
    style: 'premium',
    colorScheme: 'bg-gradient-to-br from-black via-zinc-900 to-amber-900/20',
    new: true
  },
  {
    id: 'pixieset',
    name: 'Pixieset Classic',
    description: 'Diseño profesional inspirado en galerías fotográficas clásicas',
    icon: Camera,
    preview: '/templates/pixieset-preview.jpg',
    features: [
      'Diseño profesional',
      'Vista de galería clásica',
      'Navegación intuitiva',
      'Colores neutros',
      'Enfoque en las fotos'
    ],
    style: 'classic',
    colorScheme: 'bg-gradient-to-br from-blue-50 to-indigo-100'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Estilo editorial con enfoque en la presentación de contenido',
    icon: Image,
    preview: '/templates/editorial-preview.jpg',
    features: [
      'Estilo editorial',
      'Tipografía legible',
      'Organización clara',
      'Diseño equilibrado',
      'Presentación profesional'
    ],
    style: 'classic',
    colorScheme: 'bg-gradient-to-br from-green-50 to-emerald-100'
  },
  {
    id: 'minimal',
    name: 'Minimal Simple',
    description: 'Diseño minimalista básico con funcionalidad esencial',
    icon: Monitor,
    preview: '/templates/minimal-preview.jpg',
    features: [
      'Diseño simple',
      'Funcionalidad básica',
      'Carga rápida',
      'Fácil navegación',
      'Interfaz limpia'
    ],
    style: 'minimal',
    colorScheme: 'bg-gradient-to-br from-gray-100 to-gray-200'
  }
];

interface TemplateSelectorProps {
  currentTemplate: TemplateType;
  onTemplateChange: (template: TemplateType) => void;
  className?: string;
}

export function TemplateSelector({ currentTemplate, onTemplateChange, className = '' }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(currentTemplate);
  const [showPreview, setShowPreview] = useState(false);

  const currentTemplateInfo = TEMPLATES.find(t => t.id === currentTemplate);

  const handleTemplateSelect = (templateId: TemplateType) => {
    setSelectedTemplate(templateId);
    onTemplateChange(templateId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Template:</span>
        </div>
        <Select value={currentTemplate} onValueChange={handleTemplateSelect}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar template" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATES.map(template => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center space-x-2">
                  <template.icon className="h-4 w-4" />
                  <span>{template.name}</span>
                  {template.new && (
                    <Badge className="text-xs bg-blue-100 dark:bg-blue-950/30 text-blue-700 px-1">
                      Nuevo
                    </Badge>
                  )}
                  {template.recommended && (
                    <Badge className="text-xs bg-green-100 text-green-700 px-1">
                      ⭐
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Seleccionar Template</span>
              </DialogTitle>
              <DialogDescription>
                Elige el diseño que mejor represente tu estilo fotográfico
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {TEMPLATES.map(template => (
                <Card 
                  key={template.id} 
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate === template.id 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : 'hover:ring-1 hover:ring-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  {/* Template Preview */}
                  <div className={`h-32 ${template.colorScheme} rounded-t-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <template.icon className="h-12 w-12 text-black/20" />
                    </div>
                    
                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      {template.new && (
                        <Badge className="text-xs bg-blue-500 text-white">
                          Nuevo
                        </Badge>
                      )}
                      {template.recommended && (
                        <Badge className="text-xs bg-green-500 text-white">
                          ⭐ Recomendado
                        </Badge>
                      )}
                    </div>

                    {/* Selected indicator */}
                    {selectedTemplate === template.id && (
                      <div className="absolute top-2 left-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Eye className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                        <template.icon className="h-4 w-4" />
                        <span>{template.name}</span>
                      </h3>
                      {template.style && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {template.style}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {template.description}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Características:
                      </p>
                      <ul className="space-y-1">
                        {template.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="text-xs text-gray-600 flex items-center">
                            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      {template.features.length > 3 && (
                        <p className="text-xs text-gray-500 italic">
                          +{template.features.length - 3} características más
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex space-x-1">
                        {/* Style indicators */}
                        {template.style === 'minimal' && (
                          <div className="flex items-center space-x-1">
                            <Monitor className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500">Minimal</span>
                          </div>
                        )}
                        {template.style === 'vibrant' && (
                          <div className="flex items-center space-x-1">
                            <Sparkles className="h-3 w-3 text-purple-500" />
                            <span className="text-xs text-purple-500">Vibrante</span>
                          </div>
                        )}
                        {template.style === 'premium' && (
                          <div className="flex items-center space-x-1">
                            <Award className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-500">Premium</span>
                          </div>
                        )}
                        {template.style === 'classic' && (
                          <div className="flex items-center space-x-1">
                            <Camera className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-500">Clásico</span>
                          </div>
                        )}
                      </div>

                      <Button 
                        size="sm" 
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template.id);
                        }}
                      >
                        {selectedTemplate === template.id ? 'Seleccionado' : 'Seleccionar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected template details */}
            {selectedTemplate && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-2 mb-3">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">
                    Template Seleccionado: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Descripción:</strong> {TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Todas las características:</p>
                    <ul className="space-y-1">
                      {TEMPLATES.find(t => t.id === selectedTemplate)?.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Monitor className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Responsive</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Smartphone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Mobile First</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      onTemplateChange(selectedTemplate);
                      setShowPreview(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Aplicar Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Current template info */}
      {currentTemplateInfo && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className={`w-12 h-12 ${currentTemplateInfo.colorScheme} rounded-lg flex items-center justify-center`}>
                <currentTemplateInfo.icon className="h-6 w-6 text-black/40" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900">{currentTemplateInfo.name}</h3>
                  {currentTemplateInfo.new && (
                    <Badge className="text-xs bg-blue-100 dark:bg-blue-950/30 text-blue-700">Nuevo</Badge>
                  )}
                  {currentTemplateInfo.recommended && (
                    <Badge className="text-xs bg-green-100 text-green-700">⭐ Recomendado</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{currentTemplateInfo.description}</p>
                <div className="flex flex-wrap gap-1">
                  {currentTemplateInfo.features.slice(0, 3).map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {currentTemplateInfo.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentTemplateInfo.features.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TemplateSelector;