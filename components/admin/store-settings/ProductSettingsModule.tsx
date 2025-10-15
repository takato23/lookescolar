/**
 * 📦 Módulo de configuración de productos
 * Maneja la configuración de productos individuales
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Package, Eye, EyeOff } from 'lucide-react';
import { StoreConfig, StoreProduct } from '@/lib/validations/store-config';

interface ProductSettingsModuleProps {
  config: StoreConfig;
  onUpdateProduct: (productId: string, updates: Partial<StoreProduct>) => void;
  formatPrice: (price: number) => string;
}

export const ProductSettingsModule: React.FC<ProductSettingsModuleProps> = ({
  config,
  onUpdateProduct,
  formatPrice
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Productos Disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.products.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            onUpdate={(updates) => onUpdateProduct(product.id, updates)}
            formatPrice={formatPrice}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface ProductItemProps {
  product: StoreProduct;
  onUpdate: (updates: Partial<StoreProduct>) => void;
  formatPrice: (price: number) => string;
}

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  onUpdate,
  formatPrice
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {product.enabled ? (
            <Eye className="h-4 w-4 text-green-600" aria-label="Producto habilitado" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-label="Producto deshabilitado" />
          )}
          <div>
            <h4 className="font-medium">{product.name}</h4>
            <p className="text-sm text-muted-foreground0">{product.description}</p>
          </div>
          <Badge variant={product.type === 'digital' ? 'secondary' : 'default'}>
            {product.type === 'digital' ? 'Digital' : 'Físico'}
          </Badge>
        </div>
        <Switch
          checked={product.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
          aria-label={`Habilitar ${product.name}`}
        />
      </div>

      {product.enabled && (
        <div className="grid grid-cols-2 gap-3 pl-7" role="group" aria-label={`Configuración de ${product.name}`}>
          <div>
            <Label htmlFor={`price-${product.id}`}>Precio</Label>
            <Input
              id={`price-${product.id}`}
              type="number"
              min="0"
              step="0.01"
              value={product.price / 100}
              onChange={(e) => onUpdate({
                price: Math.round((parseFloat(e.target.value) || 0) * 100)
              })}
              placeholder="0.00"
              aria-label={`Precio de ${product.name}`}
            />
            <p className="text-xs text-muted-foreground0 mt-1">
              Precio actual: {formatPrice(product.price)}
            </p>
          </div>
          <div>
            <Label htmlFor={`desc-${product.id}`}>Descripción</Label>
            <Input
              id={`desc-${product.id}`}
              value={product.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Descripción del producto"
              aria-label={`Descripción de ${product.name}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
