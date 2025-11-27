'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Palette,
  Image as ImageIcon,
  Type,
  Layout,
  Eye,
  Save,
  Upload,
  X,
  Check,
  Sparkles,
  Share2,
  Heart,
  Camera
} from 'lucide-react';
import Image from 'next/image';
import { GalleryStyleType, getStyleColors, getStyleComponent } from '@/components/gallery/GalleryStyles';

// Gallery metadata interface matching PublicGallery
export interface GalleryConfigMetadata {
  gallery_style?: GalleryStyleType;
  cover_image?: string;
  cover_title?: string;
  cover_subtitle?: string;
  logo_url?: string;
  accent_color?: string;
  show_share_button?: boolean;
  show_favorites?: boolean;
}

interface GalleryConfigPanelProps {
  eventId: string;
  eventName: string;
  eventDate?: string;
  initialMetadata?: GalleryConfigMetadata | null;
  onSave?: (metadata: GalleryConfigMetadata) => void;
}

// Style preview data
const STYLE_PREVIEWS: Record<GalleryStyleType, { name: string; description: string; preview: string }> = {
  pixieset: {
    name: 'Pixieset',
    description: 'Elegante y minimalista con animaciones suaves',
    preview: '/mockups/pixieset-preview.jpg'
  },
  magazine: {
    name: 'Magazine',
    description: 'Estilo revista con layout asimétrico',
    preview: '/mockups/magazine-preview.jpg'
  },
  polaroid: {
    name: 'Polaroid',
    description: 'Nostálgico con marcos estilo Polaroid',
    preview: '/mockups/polaroid-preview.jpg'
  },
  editorial: {
    name: 'Editorial',
    description: 'Profesional con espacios amplios',
    preview: '/mockups/editorial-preview.jpg'
  },
  cards: {
    name: 'Cards',
    description: 'Tarjetas modernas con sombras suaves',
    preview: '/mockups/cards-preview.jpg'
  },
  film: {
    name: 'Film',
    description: 'Estética cinematográfica oscura',
    preview: '/mockups/film-preview.jpg'
  }
};

// Accent color presets
const ACCENT_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Pink', value: '#ec4899' },
];

export default function GalleryConfigPanel({
  eventId,
  eventName,
  eventDate,
  initialMetadata,
  onSave
}: GalleryConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'branding' | 'options'>('style');
  const [saving, startSaving] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Config state
  const [config, setConfig] = useState<GalleryConfigMetadata>({
    gallery_style: 'pixieset',
    cover_image: '',
    cover_title: '',
    cover_subtitle: '',
    logo_url: '',
    accent_color: '#10b981',
    show_share_button: true,
    show_favorites: true,
    ...initialMetadata
  });

  // Sync with initial metadata
  useEffect(() => {
    if (initialMetadata) {
      setConfig(prev => ({ ...prev, ...initialMetadata }));
    }
  }, [initialMetadata]);

  const updateConfig = <K extends keyof GalleryConfigMetadata>(
    key: K,
    value: GalleryConfigMetadata[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Handle image upload
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cover' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('eventId', eventId);

      const response = await fetch('/api/admin/gallery/upload-asset', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error uploading image');
      }

      const data = await response.json();

      if (type === 'cover') {
        updateConfig('cover_image', data.url);
      } else {
        updateConfig('logo_url', data.url);
      }

      toast.success(`${type === 'cover' ? 'Cover' : 'Logo'} actualizado`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen');
    }
  };

  // Save configuration
  const saveConfig = useCallback(() => {
    startSaving(async () => {
      try {
        // Fetch current event to get existing metadata
        const eventRes = await fetch(`/api/admin/events/${eventId}`);
        const eventData = await eventRes.json();
        const existingMetadata = eventData.event?.metadata || {};

        // Merge with gallery config
        const updatedMetadata = {
          ...existingMetadata,
          ...config
        };

        const response = await fetch(`/api/admin/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: updatedMetadata })
        });

        if (!response.ok) {
          throw new Error('Failed to save gallery configuration');
        }

        toast.success('Configuración de galería guardada');
        onSave?.(config);
      } catch (error) {
        console.error('Save error:', error);
        toast.error('Error al guardar la configuración');
      }
    });
  }, [eventId, config, onSave]);

  // Get current style colors for preview
  const styleColors = getStyleColors(config.gallery_style || 'pixieset');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configuración de Galería</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza cómo se verá la galería para tus clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Ocultar' : 'Vista Previa'}
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="style" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Estilo
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Opciones
              </TabsTrigger>
            </TabsList>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estilo de Galería</CardTitle>
                  <CardDescription>
                    Elige el diseño visual de la galería
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(STYLE_PREVIEWS) as [GalleryStyleType, typeof STYLE_PREVIEWS['pixieset']][]).map(([key, style]) => (
                      <button
                        key={key}
                        onClick={() => updateConfig('gallery_style', key)}
                        className={`group relative rounded-lg border-2 p-3 text-left transition-all ${
                          config.gallery_style === key
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        {/* Style Preview Thumbnail */}
                        <div className="aspect-video mb-2 rounded bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden relative">
                          {/* Simulated gallery preview */}
                          <div className={`absolute inset-0 p-2 ${
                            key === 'film' ? 'bg-neutral-900' :
                            key === 'polaroid' ? 'bg-[#e8e4df]' :
                            key === 'editorial' ? 'bg-white' :
                            'bg-gray-50'
                          }`}>
                            <div className="grid grid-cols-3 gap-1 h-full">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`rounded-sm ${
                                    key === 'polaroid' ? 'bg-white p-0.5 shadow-sm' :
                                    key === 'cards' ? 'bg-white shadow-sm rounded' :
                                    key === 'film' ? 'bg-neutral-800' :
                                    'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                >
                                  <div className={`w-full h-full rounded-sm ${
                                    key === 'film' ? 'bg-amber-900/30' : 'bg-gray-400 dark:bg-gray-500'
                                  }`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="font-medium text-sm">{style.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {style.description}
                        </div>

                        {config.gallery_style === key && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Accent Color */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Color de Acento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateConfig('accent_color', color.value)}
                        className={`w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                          config.accent_color === color.value
                            ? 'ring-2 ring-offset-2 ring-gray-400'
                            : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={config.accent_color || '#10b981'}
                        onChange={(e) => updateConfig('accent_color', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                      />
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: config.accent_color }}
                      >
                        <Palette className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4">
              {/* Cover Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Imagen de Cover
                  </CardTitle>
                  <CardDescription>
                    Imagen principal que aparece en la página de inicio de la galería
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {config.cover_image ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={config.cover_image}
                        alt="Cover"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        onClick={() => updateConfig('cover_image', '')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 transition-colors"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Click para subir imagen de cover
                      </span>
                      <span className="text-xs text-gray-400">
                        JPG, PNG o WebP (max 5MB)
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'cover')}
                    className="hidden"
                  />

                  {/* URL input alternative */}
                  <div className="space-y-2">
                    <Label className="text-xs">O ingresa una URL de imagen:</Label>
                    <Input
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={config.cover_image || ''}
                      onChange={(e) => updateConfig('cover_image', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Logo
                  </CardTitle>
                  <CardDescription>
                    Logo del colegio o tu marca personal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {config.logo_url ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                      <Image
                        src={config.logo_url}
                        alt="Logo"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                      <button
                        onClick={() => updateConfig('logo_url', '')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="w-32 h-32 mx-auto rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 transition-colors"
                    >
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500">Subir logo</span>
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                    className="hidden"
                  />

                  <div className="space-y-2">
                    <Label className="text-xs">O ingresa una URL:</Label>
                    <Input
                      placeholder="https://ejemplo.com/logo.png"
                      value={config.logo_url || ''}
                      onChange={(e) => updateConfig('logo_url', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Cover Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Textos del Cover
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cover_title">Título</Label>
                    <Input
                      id="cover_title"
                      placeholder={eventName || "Nombre del evento"}
                      value={config.cover_title || ''}
                      onChange={(e) => updateConfig('cover_title', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si está vacío, se usa el nombre del evento
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover_subtitle">Subtítulo</Label>
                    <Input
                      id="cover_subtitle"
                      placeholder={eventDate || "Fecha o descripción"}
                      value={config.cover_subtitle || ''}
                      onChange={(e) => updateConfig('cover_subtitle', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si está vacío, se usa la fecha del evento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Funcionalidades</CardTitle>
                  <CardDescription>
                    Activa o desactiva funciones de la galería
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-blue-500" />
                        <Label>Botón Compartir</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Permite a los clientes compartir la galería
                      </p>
                    </div>
                    <Switch
                      checked={config.show_share_button !== false}
                      onCheckedChange={(v) => updateConfig('show_share_button', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <Label>Favoritos</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Permite marcar fotos como favoritas
                      </p>
                    </div>
                    <Switch
                      checked={config.show_favorites !== false}
                      onCheckedChange={(v) => updateConfig('show_favorites', v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
          <Card className="sticky top-4 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`aspect-[9/16] max-h-[600px] overflow-hidden ${styleColors.background}`}
              >
                {/* Preview Cover */}
                <div className="relative h-full flex flex-col">
                  {/* Cover Image Area */}
                  <div className="relative flex-1 min-h-0">
                    {config.cover_image ? (
                      <Image
                        src={config.cover_image}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Logo */}
                    {config.logo_url && (
                      <div className="absolute top-4 left-4 w-12 h-12 rounded-lg bg-white/90 p-1.5 shadow-lg">
                        <Image
                          src={config.logo_url}
                          alt="Logo"
                          width={40}
                          height={40}
                          className="object-contain w-full h-full"
                          unoptimized
                        />
                      </div>
                    )}

                    {/* Cover Text */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-2xl font-light tracking-widest uppercase mb-2">
                        {config.cover_title || eventName || 'Galería de Fotos'}
                      </h3>
                      <p className="text-sm text-white/70 tracking-wide">
                        {config.cover_subtitle || eventDate || 'Tu evento especial'}
                      </p>

                      <button
                        className="mt-4 px-6 py-2 rounded-full text-sm font-medium transition-colors"
                        style={{ backgroundColor: config.accent_color || '#10b981' }}
                      >
                        Ver Galería
                      </button>
                    </div>
                  </div>

                  {/* Preview Gallery Grid */}
                  <div className={`p-3 ${styleColors.background}`}>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded ${
                            config.gallery_style === 'polaroid' ? 'bg-white p-1 shadow-sm' :
                            config.gallery_style === 'cards' ? 'bg-white shadow-sm rounded-lg' :
                            config.gallery_style === 'film' ? 'bg-neutral-800' :
                            ''
                          }`}
                        >
                          <div className={`w-full h-full rounded bg-gradient-to-br ${
                            config.gallery_style === 'film'
                              ? 'from-amber-900/50 to-amber-800/30'
                              : 'from-gray-300 to-gray-400'
                          }`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
