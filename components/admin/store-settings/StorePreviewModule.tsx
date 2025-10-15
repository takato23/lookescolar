/**
 * 👁️ Módulo de preview de la tienda
 * Muestra cómo se verá la tienda con la configuración actual
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Smartphone, Monitor } from 'lucide-react';
import { StoreConfig } from '@/lib/validations/store-config';
import { cn } from '@/lib/utils';

interface StorePreviewModuleProps {
  config: StoreConfig;
  formatPrice: (price: number) => string;
}

export const StorePreviewModule: React.FC<StorePreviewModuleProps> = ({
  config,
  formatPrice
}) => {
  const activeProducts = config.products.filter(p => p.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview de la Tienda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vista móvil */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            Vista móvil
          </div>
          <div className="border rounded-lg p-4 bg-card shadow-sm max-w-sm mx-auto">
            <div className="space-y-3">
              {/* Header con logo */}
              <div className="text-center space-y-2">
                {config.logo_url && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="w-16 h-16 mx-auto rounded-full object-cover"
                  />
                )}
                <h2 className="text-lg font-semibold" style={{ color: config.colors?.primary }}>
                  Galería Fotográfica
                </h2>
                <p className="text-sm text-muted-foreground">
                  Encuentra tus mejores momentos escolares
                </p>
              </div>

              {/* Productos */}
              <div className="space-y-3">
                {activeProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <Badge variant={product.type === 'digital' ? 'secondary' : 'default'} className="text-xs">
                        {product.type === 'digital' ? 'Digital' : 'Físico'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: config.colors?.accent }}>
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-muted-foreground0">
                        {product.options?.sizes?.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground0 pt-2 border-t">
                © 2024 LookEscolar - Fotografía Escolar
              </div>
            </div>
          </div>
        </div>

        {/* Vista desktop */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            Vista desktop
          </div>
          <div className="border rounded-lg p-4 bg-card shadow-sm max-w-2xl mx-auto">
            <div className="space-y-4">
              {/* Header con banner */}
              <div className="relative h-32 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg overflow-hidden">
                {config.banner_url ? (
                  <img
                    src={config.banner_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-surface/80 flex items-center justify-center">
                        {config.logo_url ? (
                          <img
                            src={config.logo_url}
                            alt="Logo"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <Eye className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <h2 className="text-xl font-semibold" style={{ color: config.colors?.primary }}>
                        Galería Fotográfica
                      </h2>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-3 gap-4">
                {activeProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted rounded flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-1 rounded bg-surface/80 flex items-center justify-center">
                          📷
                        </div>
                        <Badge variant={product.type === 'digital' ? 'secondary' : 'default'} className="text-xs">
                          {product.type === 'digital' ? 'Digital' : 'Físico'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: config.colors?.accent }}>
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-xs text-muted-foreground0">
                          {product.options?.sizes?.[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-muted-foreground0 pt-4 border-t">
                © 2024 LookEscolar - Fotografía Escolar
              </div>
            </div>
          </div>
        </div>

        {/* Información de preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Información del Preview</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los colores se aplican dinámicamente según tu configuración</li>
            <li>• Solo se muestran productos habilitados</li>
            <li>• Los precios se formatean según la moneda seleccionada</li>
            <li>• El logo y banner se muestran si están configurados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
