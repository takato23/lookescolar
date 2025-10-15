/**
 * 📝 Módulo de textos personalizables
 * Permite editar textos de la tienda como títulos, descripciones, etc.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { MessageSquare } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';

interface TextsModuleProps {
  config: StoreConfig;
  onUpdate: (updates: Partial<StoreConfig>) => void;
}

export const TextsModule: React.FC<TextsModuleProps> = ({
  config,
  onUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Textos de la Tienda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Título principal */}
        <div className="space-y-2">
          <Label htmlFor="hero-title">Título principal</Label>
          <Input
            id="hero-title"
            value={config.texts?.hero_title || 'Galería Fotográfica'}
            onChange={(e) => onUpdate({
              texts: { ...config.texts, hero_title: e.target.value }
            })}
            placeholder="Galería Fotográfica"
            aria-label="Título principal de la tienda"
          />
          <p className="text-xs text-muted-foreground0">
            Aparece en la parte superior de la tienda
          </p>
        </div>

        <Separator />

        {/* Subtítulo */}
        <div className="space-y-2">
          <Label htmlFor="hero-subtitle">Subtítulo</Label>
          <Input
            id="hero-subtitle"
            value={config.texts?.hero_subtitle || 'Encuentra tus mejores momentos escolares'}
            onChange={(e) => onUpdate({
              texts: { ...config.texts, hero_subtitle: e.target.value }
            })}
            placeholder="Encuentra tus mejores momentos escolares"
            aria-label="Subtítulo de la tienda"
          />
          <p className="text-xs text-muted-foreground0">
            Aparece debajo del título principal
          </p>
        </div>

        <Separator />

        {/* Texto del footer */}
        <div className="space-y-2">
          <Label htmlFor="footer-text">Texto del pie de página</Label>
          <Input
            id="footer-text"
            value={config.texts?.footer_text || '© 2024 LookEscolar - Fotografía Escolar'}
            onChange={(e) => onUpdate({
              texts: { ...config.texts, footer_text: e.target.value }
            })}
            placeholder="© 2024 LookEscolar - Fotografía Escolar"
            aria-label="Texto del pie de página"
          />
          <p className="text-xs text-muted-foreground0">
            Aparece en la parte inferior de la tienda
          </p>
        </div>

        <Separator />

        {/* Información de contacto */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email de contacto</Label>
            <Input
              id="contact-email"
              type="email"
              value={config.texts?.contact_email || ''}
              onChange={(e) => onUpdate({
                texts: { ...config.texts, contact_email: e.target.value }
              })}
              placeholder="info@escuela.edu.ar"
              aria-label="Email de contacto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Teléfono de contacto</Label>
            <Input
              id="contact-phone"
              value={config.texts?.contact_phone || ''}
              onChange={(e) => onUpdate({
                texts: { ...config.texts, contact_phone: e.target.value }
              })}
              placeholder="+54 11 1234-5678"
              aria-label="Teléfono de contacto"
            />
          </div>
        </div>

        <Separator />

        {/* Enlaces legales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="terms-url">Enlace a términos y condiciones</Label>
            <Input
              id="terms-url"
              type="url"
              value={config.texts?.terms_url || ''}
              onChange={(e) => onUpdate({
                texts: { ...config.texts, terms_url: e.target.value }
              })}
              placeholder="https://escuela.edu.ar/terminos"
              aria-label="URL de términos y condiciones"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="privacy-url">Enlace a política de privacidad</Label>
            <Input
              id="privacy-url"
              type="url"
              value={config.texts?.privacy_url || ''}
              onChange={(e) => onUpdate({
                texts: { ...config.texts, privacy_url: e.target.value }
              })}
              placeholder="https://escuela.edu.ar/privacidad"
              aria-label="URL de política de privacidad"
            />
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">💡 Consejos para textos</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Usa un título claro y atractivo que identifique el evento</li>
            <li>• El subtítulo debe ser descriptivo y motivador</li>
            <li>• Incluye información de contacto real para consultas</li>
            <li>• Los enlaces legales son importantes para cumplimiento normativo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
