'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Crown,
  Download,
  Camera,
  Settings,
  Save,
  X,
  Copy,
  DollarSign,
  Palette,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ProductCategory,
  PhotoProduct,
  ComboPackage,
  ProductType,
  FinishType,
  PaperQuality,
  PricingType,
  CreateProductRequest,
  CreateComboRequest,
  formatProductSize,
  formatProductSpecs,
  isPhysicalProduct,
} from '@/lib/types/products';
import { formatProductPrice } from '@/lib/services/product-pricing';

interface ProductManagementPanelProps {
  eventId?: string;
  onProductChange?: () => void;
}

interface EditingProduct extends Partial<PhotoProduct> {
  isNew?: boolean;
}

interface EditingCombo extends Partial<ComboPackage> {
  isNew?: boolean;
  items?: Array<{
    product_id: string;
    quantity: number;
    is_required: boolean;
    additional_price: number;
  }>;
}

export function ProductManagementPanel({
  eventId,
  onProductChange,
}: ProductManagementPanelProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<PhotoProduct[]>([]);
  const [combos, setCombos] = useState<ComboPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing states
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(
    null
  );
  const [editingCombo, setEditingCombo] = useState<EditingCombo | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        include_inactive: 'true',
      });

      if (eventId) {
        queryParams.set('event_id', eventId);
      }

      const response = await fetch(`/api/products/catalog?${queryParams}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar datos');
      }

      const { categories, products, combos } = result.data;
      setCategories(categories);
      setProducts(products);
      setCombos(combos);
    } catch (error) {
      console.error('[ProductManagement] Error loading data:', error);
      setError(
        error instanceof Error ? error.message : 'Error al cargar datos'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct({
      isNew: true,
      type: 'print',
      finish: 'glossy',
      paper_quality: 'standard',
      base_price: 1000,
      is_active: true,
      is_featured: false,
    });
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: PhotoProduct) => {
    setEditingProduct({ ...product, isNew: false });
    setIsProductDialogOpen(true);
  };

  const handleCreateCombo = () => {
    setEditingCombo({
      isNew: true,
      min_photos: 1,
      max_photos: undefined,
      allows_duplicates: true,
      pricing_type: 'fixed',
      base_price: 2500,
      is_active: true,
      is_featured: false,
      items: [],
    });
    setIsComboDialogOpen(true);
  };

  const handleEditCombo = (combo: ComboPackage) => {
    setEditingCombo({
      ...combo,
      isNew: false,
      items:
        combo.items?.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          is_required: item.is_required,
          additional_price: item.additional_price || 0,
        })) || [],
    });
    setIsComboDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      const productData: CreateProductRequest = {
        category_id: editingProduct.category_id!,
        name: editingProduct.name!,
        description: editingProduct.description,
        type: editingProduct.type!,
        width_cm: editingProduct.width_cm,
        height_cm: editingProduct.height_cm,
        finish: editingProduct.finish,
        paper_quality: editingProduct.paper_quality,
        base_price: editingProduct.base_price!,
        image_url: editingProduct.image_url,
        is_featured: editingProduct.is_featured,
      };

      const url = editingProduct.isNew
        ? '/api/products/catalog'
        : `/api/products/${editingProduct.id}`;

      const method = editingProduct.isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar producto');
      }

      setIsProductDialogOpen(false);
      setEditingProduct(null);
      await loadData();
      onProductChange?.();
    } catch (error) {
      console.error('[ProductManagement] Error saving product:', error);
      alert(
        error instanceof Error ? error.message : 'Error al guardar producto'
      );
    }
  };

  const handleSaveCombo = async () => {
    if (!editingCombo) return;

    try {
      const comboData: CreateComboRequest = {
        name: editingCombo.name!,
        description: editingCombo.description,
        min_photos: editingCombo.min_photos!,
        max_photos: editingCombo.max_photos,
        allows_duplicates: editingCombo.allows_duplicates!,
        pricing_type: editingCombo.pricing_type!,
        base_price: editingCombo.base_price!,
        price_per_photo: editingCombo.price_per_photo,
        image_url: editingCombo.image_url,
        badge_text: editingCombo.badge_text,
        badge_color: editingCombo.badge_color,
        is_featured: editingCombo.is_featured,
        items: editingCombo.items || [],
      };

      const url = editingCombo.isNew
        ? '/api/products/combos'
        : `/api/products/combos/${editingCombo.id}`;

      const method = editingCombo.isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar combo');
      }

      setIsComboDialogOpen(false);
      setEditingCombo(null);
      await loadData();
      onProductChange?.();
    } catch (error) {
      console.error('[ProductManagement] Error saving combo:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar combo');
    }
  };

  const handleToggleProductStatus = async (product: PhotoProduct) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al cambiar estado');
      }

      await loadData();
      onProductChange?.();
    } catch (error) {
      console.error('[ProductManagement] Error toggling status:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    }
  };

  const filteredProducts = products.filter((product) => {
    if (categoryFilter !== 'all' && product.category_id !== categoryFilter)
      return false;
    if (typeFilter !== 'all' && product.type !== typeFilter) return false;
    if (statusFilter === 'active' && !product.is_active) return false;
    if (statusFilter === 'inactive' && product.is_active) return false;
    return true;
  });

  const filteredCombos = combos.filter((combo) => {
    if (statusFilter === 'active' && !combo.is_active) return false;
    if (statusFilter === 'inactive' && combo.is_active) return false;
    return true;
  });

  const ProductForm = () => {
    if (!editingProduct) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="product-name">Nombre del producto *</Label>
            <Input
              id="product-name"
              value={editingProduct.name || ''}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  name: e.target.value,
                })
              }
              placeholder="Ej: Foto 10x15cm Premium"
            />
          </div>

          <div>
            <Label htmlFor="product-category">Categoría *</Label>
            <Select
              value={editingProduct.category_id || ''}
              onValueChange={(value) =>
                setEditingProduct({
                  ...editingProduct,
                  category_id: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="product-description">Descripción</Label>
          <Textarea
            id="product-description"
            value={editingProduct.description || ''}
            onChange={(e) =>
              setEditingProduct({
                ...editingProduct,
                description: e.target.value,
              })
            }
            placeholder="Descripción del producto..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="product-type">Tipo *</Label>
            <Select
              value={editingProduct.type || 'print'}
              onValueChange={(value: ProductType) =>
                setEditingProduct({
                  ...editingProduct,
                  type: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="print">Impresión</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="package">Paquete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="product-price">Precio base (centavos) *</Label>
            <Input
              id="product-price"
              type="number"
              value={editingProduct.base_price || 0}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  base_price: parseInt(e.target.value) || 0,
                })
              }
              placeholder="1000"
            />
            <div className="mt-1 text-sm text-gray-500">
              {formatProductPrice(editingProduct.base_price || 0)}
            </div>
          </div>

          <div>
            <Label htmlFor="product-image">URL de imagen</Label>
            <Input
              id="product-image"
              value={editingProduct.image_url || ''}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  image_url: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>
        </div>

        {editingProduct.type !== 'digital' && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="flex items-center font-medium">
              <Ruler className="mr-2 h-4 w-4" />
              Especificaciones físicas
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="product-width">Ancho (cm) *</Label>
                <Input
                  id="product-width"
                  type="number"
                  step="0.1"
                  value={editingProduct.width_cm || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      width_cm: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="10.0"
                />
              </div>

              <div>
                <Label htmlFor="product-height">Alto (cm) *</Label>
                <Input
                  id="product-height"
                  type="number"
                  step="0.1"
                  value={editingProduct.height_cm || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      height_cm: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="15.0"
                />
              </div>

              <div>
                <Label htmlFor="product-finish">Acabado</Label>
                <Select
                  value={editingProduct.finish || 'glossy'}
                  onValueChange={(value: FinishType) =>
                    setEditingProduct({
                      ...editingProduct,
                      finish: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glossy">Brillante</SelectItem>
                    <SelectItem value="matte">Mate</SelectItem>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="metallic">Metálico</SelectItem>
                    <SelectItem value="wood">Madera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="product-quality">Calidad del papel</Label>
                <Select
                  value={editingProduct.paper_quality || 'standard'}
                  onValueChange={(value: PaperQuality) =>
                    setEditingProduct({
                      ...editingProduct,
                      paper_quality: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Estándar</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="professional">Profesional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-6 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={editingProduct.is_active ?? true}
              onCheckedChange={(checked) =>
                setEditingProduct({
                  ...editingProduct,
                  is_active: checked,
                })
              }
            />
            <Label>Producto activo</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={editingProduct.is_featured ?? false}
              onCheckedChange={(checked) =>
                setEditingProduct({
                  ...editingProduct,
                  is_featured: checked,
                })
              }
            />
            <Label>Producto destacado</Label>
          </div>
        </div>
      </div>
    );
  };

  const ComboForm = () => {
    if (!editingCombo) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="combo-name">Nombre del combo *</Label>
            <Input
              id="combo-name"
              value={editingCombo.name || ''}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  name: e.target.value,
                })
              }
              placeholder="Ej: Combo Familiar"
            />
          </div>

          <div>
            <Label htmlFor="combo-pricing">Tipo de precio *</Label>
            <Select
              value={editingCombo.pricing_type || 'fixed'}
              onValueChange={(value: PricingType) =>
                setEditingCombo({
                  ...editingCombo,
                  pricing_type: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Precio fijo</SelectItem>
                <SelectItem value="per_photo">Precio por foto</SelectItem>
                <SelectItem value="tiered">Precio escalonado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="combo-description">Descripción</Label>
          <Textarea
            id="combo-description"
            value={editingCombo.description || ''}
            onChange={(e) =>
              setEditingCombo({
                ...editingCombo,
                description: e.target.value,
              })
            }
            placeholder="Descripción del combo..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="combo-min-photos">Fotos mínimas *</Label>
            <Input
              id="combo-min-photos"
              type="number"
              min="1"
              value={editingCombo.min_photos || 1}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  min_photos: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="combo-max-photos">Fotos máximas</Label>
            <Input
              id="combo-max-photos"
              type="number"
              min="1"
              value={editingCombo.max_photos || ''}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  max_photos: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="Sin límite"
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Switch
              checked={editingCombo.allows_duplicates ?? true}
              onCheckedChange={(checked) =>
                setEditingCombo({
                  ...editingCombo,
                  allows_duplicates: checked,
                })
              }
            />
            <Label>Permitir fotos duplicadas</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="combo-base-price">Precio base (centavos) *</Label>
            <Input
              id="combo-base-price"
              type="number"
              value={editingCombo.base_price || 0}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  base_price: parseInt(e.target.value) || 0,
                })
              }
              placeholder="2500"
            />
            <div className="mt-1 text-sm text-gray-500">
              {formatProductPrice(editingCombo.base_price || 0)}
            </div>
          </div>

          {editingCombo.pricing_type === 'per_photo' && (
            <div>
              <Label htmlFor="combo-price-per-photo">
                Precio por foto adicional (centavos)
              </Label>
              <Input
                id="combo-price-per-photo"
                type="number"
                value={editingCombo.price_per_photo || 0}
                onChange={(e) =>
                  setEditingCombo({
                    ...editingCombo,
                    price_per_photo: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="500"
              />
              <div className="mt-1 text-sm text-gray-500">
                {formatProductPrice(editingCombo.price_per_photo || 0)} por foto
                extra
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="combo-image">URL de imagen</Label>
            <Input
              id="combo-image"
              value={editingCombo.image_url || ''}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  image_url: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="combo-badge">Texto del badge</Label>
            <Input
              id="combo-badge"
              value={editingCombo.badge_text || ''}
              onChange={(e) =>
                setEditingCombo({
                  ...editingCombo,
                  badge_text: e.target.value,
                })
              }
              placeholder="Ej: POPULAR"
            />
          </div>

          <div>
            <Label htmlFor="combo-badge-color">Color del badge</Label>
            <Select
              value={editingCombo.badge_color || 'blue'}
              onValueChange={(value) =>
                setEditingCombo({
                  ...editingCombo,
                  badge_color: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Azul</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
                <SelectItem value="purple">Morado</SelectItem>
                <SelectItem value="orange">Naranja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-6 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={editingCombo.is_active ?? true}
              onCheckedChange={(checked) =>
                setEditingCombo({
                  ...editingCombo,
                  is_active: checked,
                })
              }
            />
            <Label>Combo activo</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={editingCombo.is_featured ?? false}
              onCheckedChange={(checked) =>
                setEditingCombo({
                  ...editingCombo,
                  is_featured: checked,
                })
              }
            />
            <Label>Combo destacado</Label>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">
          {error}
          <Button
            variant="link"
            className="ml-2 p-0 text-red-700 underline"
            onClick={loadData}
          >
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gestión de Productos
          </h2>
          <p className="text-gray-600">Administra productos y paquetes combo</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleCreateProduct}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
          <Button onClick={handleCreateCombo} variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Nuevo Combo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="print">Impresiones</SelectItem>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="package">Paquetes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <Camera className="h-4 w-4" />
            <span>Productos ({filteredProducts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="combos" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Combos ({filteredCombos.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Individuales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Especificaciones</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-100">
                            {product.type === 'digital' ? (
                              <Download className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Camera className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.is_featured && (
                              <Badge className="bg-yellow-100 text-xs text-yellow-800">
                                <Star className="mr-1 h-3 w-3" />
                                Destacado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {
                          categories.find((c) => c.id === product.category_id)
                            ?.name
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.type === 'print' && 'Impresión'}
                          {product.type === 'digital' && 'Digital'}
                          {product.type === 'package' && 'Paquete'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatProductSpecs(product)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatProductPrice(product.base_price)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleProductStatus(product)}
                          className={`${
                            product.is_active
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {product.is_active ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combos">
          <Card>
            <CardHeader>
              <CardTitle>Paquetes Combo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Combo</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Tipo de precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCombos.map((combo) => (
                    <TableRow key={combo.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-100">
                            <Package className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">{combo.name}</div>
                            <div className="flex items-center space-x-2">
                              {combo.is_featured && (
                                <Badge className="bg-yellow-100 text-xs text-yellow-800">
                                  <Star className="mr-1 h-3 w-3" />
                                  Destacado
                                </Badge>
                              )}
                              {combo.badge_text && (
                                <Badge
                                  className={`text-xs text-white ${
                                    combo.badge_color === 'blue'
                                      ? 'bg-blue-500'
                                      : combo.badge_color === 'green'
                                        ? 'bg-green-500'
                                        : combo.badge_color === 'purple'
                                          ? 'bg-purple-500'
                                          : combo.badge_color === 'orange'
                                            ? 'bg-orange-500'
                                            : 'bg-blue-500'
                                  }`}
                                >
                                  {combo.badge_text}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {combo.min_photos}
                        {combo.max_photos &&
                          combo.max_photos !== combo.min_photos &&
                          ` - ${combo.max_photos}`}
                        {!combo.max_photos && '+'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatProductPrice(combo.base_price)}
                        {combo.pricing_type === 'per_photo' &&
                          combo.price_per_photo && (
                            <div className="text-xs text-gray-500">
                              +{formatProductPrice(combo.price_per_photo)}/foto
                            </div>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {combo.pricing_type === 'fixed' && 'Fijo'}
                          {combo.pricing_type === 'per_photo' && 'Por foto'}
                          {combo.pricing_type === 'tiered' && 'Escalonado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${
                            combo.is_active
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {combo.is_active ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                          {combo.is_active ? 'Activo' : 'Inactivo'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCombo(combo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.isNew ? 'Crear Producto' : 'Editar Producto'}
            </DialogTitle>
          </DialogHeader>

          <ProductForm />

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsProductDialogOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct}>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Combo Dialog */}
      <Dialog open={isComboDialogOpen} onOpenChange={setIsComboDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCombo?.isNew ? 'Crear Combo' : 'Editar Combo'}
            </DialogTitle>
          </DialogHeader>

          <ComboForm />

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsComboDialogOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSaveCombo}>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
