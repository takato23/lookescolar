'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Package, 
  Star, 
  ShoppingCart, 
  Filter, 
  Search, 
  Grid3X3, 
  List,
  Crown,
  Download,
  Sparkles,
  Camera,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  ProductCategory, 
  PhotoProduct, 
  ComboPackage, 
  ProductFilters,
  formatProductSize,
  formatProductSpecs,
  isPhysicalProduct 
} from '@/lib/types/products';
import { formatProductPrice } from '@/lib/services/product-pricing';

interface ProductCatalogDisplayProps {
  categories: ProductCategory[];
  products: PhotoProduct[];
  combos: ComboPackage[];
  onProductSelect: (product: PhotoProduct) => void;
  onComboSelect: (combo: ComboPackage) => void;
  selectedPhotos?: string[];
  eventId?: string;
  className?: string;
}

export function ProductCatalogDisplay({
  categories,
  products,
  combos,
  onProductSelect,
  onComboSelect,
  selectedPhotos = [],
  eventId,
  className = ''
}: ProductCatalogDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popularity' | 'price_low' | 'price_high' | 'name'>('popularity');
  const [filters, setFilters] = useState<ProductFilters>({
    is_active: true
  });
  
  const [filteredProducts, setFilteredProducts] = useState<PhotoProduct[]>(products);
  const [filteredCombos, setFilteredCombos] = useState<ComboPackage[]>(combos);

  // Apply filters and search
  useEffect(() => {
    let filtered_products = [...products];
    let filtered_combos = [...combos];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered_products = filtered_products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
      filtered_combos = filtered_combos.filter(combo =>
        combo.name.toLowerCase().includes(query) ||
        combo.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered_products = filtered_products.filter(product =>
        product.category_id === selectedCategory
      );
    }

    // Additional filters
    if (filters.types?.length) {
      filtered_products = filtered_products.filter(product =>
        filters.types!.includes(product.type)
      );
    }

    if (filters.finishes?.length) {
      filtered_products = filtered_products.filter(product =>
        product.finish && filters.finishes!.includes(product.finish)
      );
    }

    if (filters.paper_qualities?.length) {
      filtered_products = filtered_products.filter(product =>
        product.paper_quality && filters.paper_qualities!.includes(product.paper_quality)
      );
    }

    if (filters.price_range) {
      filtered_products = filtered_products.filter(product => {
        const price = product.base_price;
        return (!filters.price_range!.min || price >= filters.price_range!.min) &&
               (!filters.price_range!.max || price <= filters.price_range!.max);
      });
      filtered_combos = filtered_combos.filter(combo => {
        const price = combo.base_price;
        return (!filters.price_range!.min || price >= filters.price_range!.min) &&
               (!filters.price_range!.max || price <= filters.price_range!.max);
      });
    }

    if (filters.is_featured !== undefined) {
      filtered_products = filtered_products.filter(product =>
        product.is_featured === filters.is_featured
      );
      filtered_combos = filtered_combos.filter(combo =>
        combo.is_featured === filters.is_featured
      );
    }

    // Sorting
    const sortFunction = (a: any, b: any) => {
      switch (sortBy) {
        case 'price_low':
          return a.base_price - b.base_price;
        case 'price_high':
          return b.base_price - a.base_price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
        default:
          // Sort by featured first, then by sort_order
          if (a.is_featured !== b.is_featured) {
            return b.is_featured ? 1 : -1;
          }
          return a.sort_order - b.sort_order;
      }
    };

    filtered_products.sort(sortFunction);
    filtered_combos.sort(sortFunction);

    setFilteredProducts(filtered_products);
    setFilteredCombos(filtered_combos);
  }, [products, combos, searchQuery, selectedCategory, sortBy, filters]);

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'print':
        return <Camera className="h-4 w-4" />;
      case 'digital':
        return <Download className="h-4 w-4" />;
      case 'combo':
      case 'package':
        return <Package className="h-4 w-4" />;
      default:
        return <Camera className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (name: string) => {
    if (name.toLowerCase().includes('premium')) return <Crown className="h-4 w-4" />;
    if (name.toLowerCase().includes('digital')) return <Download className="h-4 w-4" />;
    if (name.toLowerCase().includes('combo')) return <Package className="h-4 w-4" />;
    return <Camera className="h-4 w-4" />;
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Tipo de Producto</h3>
        <div className="space-y-2">
          {['print', 'digital', 'package', 'combo'].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.types?.includes(type as any) || false}
                onCheckedChange={(checked) => {
                  const types = filters.types || [];
                  setFilters({
                    ...filters,
                    types: checked
                      ? [...types, type as any]
                      : types.filter(t => t !== type)
                  });
                }}
              />
              <Label htmlFor={`type-${type}`} className="text-sm">
                {type === 'print' && 'Impresiones'}
                {type === 'digital' && 'Digital'}
                {type === 'package' && 'Paquetes'}
                {type === 'combo' && 'Combos'}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Acabado</h3>
        <div className="space-y-2">
          {['glossy', 'matte', 'canvas', 'metallic'].map(finish => (
            <div key={finish} className="flex items-center space-x-2">
              <Checkbox
                id={`finish-${finish}`}
                checked={filters.finishes?.includes(finish as any) || false}
                onCheckedChange={(checked) => {
                  const finishes = filters.finishes || [];
                  setFilters({
                    ...filters,
                    finishes: checked
                      ? [...finishes, finish as any]
                      : finishes.filter(f => f !== finish)
                  });
                }}
              />
              <Label htmlFor={`finish-${finish}`} className="text-sm capitalize">
                {finish}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Rango de Precio</h3>
        <div className="space-y-3">
          <Slider
            value={[filters.price_range?.min || 0, filters.price_range?.max || 10000]}
            onValueChange={([min, max]) => {
              setFilters({
                ...filters,
                price_range: { min, max }
              });
            }}
            max={10000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatProductPrice(filters.price_range?.min || 0)}</span>
            <span>{formatProductPrice(filters.price_range?.max || 10000)}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured-only"
            checked={filters.is_featured || false}
            onCheckedChange={(checked) => {
              setFilters({
                ...filters,
                is_featured: checked || undefined
              });
            }}
          />
          <Label htmlFor="featured-only" className="text-sm">
            Solo productos destacados
          </Label>
        </div>
      </div>
    </div>
  );

  const ProductCard = ({ product }: { product: PhotoProduct }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-purple-300">
      <CardHeader className="pb-3">
        <div className="relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={300}
              height={200}
              className="w-full h-48 object-cover rounded-lg bg-gray-100"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              {getProductIcon(product.type)}
              <span className="ml-2 text-gray-600">{product.name}</span>
            </div>
          )}
          
          {product.is_featured && (
            <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black">
              <Award className="h-3 w-3 mr-1" />
              Destacado
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
              {product.name}
            </h3>
            {getProductIcon(product.type)}
          </div>
          
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
          )}
          
          <div className="space-y-1">
            {isPhysicalProduct(product) && (
              <div className="text-sm text-gray-500">
                {formatProductSize(product)}
              </div>
            )}
            <div className="text-sm text-gray-500">
              {formatProductSpecs(product)}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-bold text-gray-900">
            {formatProductPrice(product.base_price)}
          </div>
          <Button
            onClick={() => onProductSelect(product)}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Seleccionar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const ComboCard = ({ combo }: { combo: ComboPackage }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-purple-300 relative overflow-hidden">
      {combo.badge_text && (
        <div className={`absolute top-0 right-0 z-10 px-3 py-1 text-xs font-bold text-white transform rotate-12 translate-x-2 -translate-y-1 ${
          combo.badge_color === 'blue' ? 'bg-blue-500' :
          combo.badge_color === 'green' ? 'bg-green-500' :
          combo.badge_color === 'purple' ? 'bg-purple-500' :
          combo.badge_color === 'orange' ? 'bg-orange-500' :
          'bg-blue-500'
        }`}>
          {combo.badge_text}
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="relative">
          {combo.image_url ? (
            <Image
              src={combo.image_url}
              alt={combo.name}
              width={300}
              height={200}
              className="w-full h-48 object-cover rounded-lg bg-gray-100"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-purple-500 mr-2" />
              <span className="text-gray-700 font-medium">{combo.name}</span>
            </div>
          )}
          
          {combo.is_featured && (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              Destacado
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
              {combo.name}
            </h3>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          
          {combo.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {combo.description}
            </p>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Fotos:</span>
              <span className="font-medium">
                {combo.min_photos}
                {combo.max_photos && combo.max_photos !== combo.min_photos && ` - ${combo.max_photos}`}
                {!combo.max_photos && '+'}
              </span>
            </div>
            
            {combo.pricing_type === 'per_photo' && combo.price_per_photo && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Por foto adicional:</span>
                <span className="font-medium">
                  {formatProductPrice(combo.price_per_photo)}
                </span>
              </div>
            )}
            
            {combo.allows_duplicates && (
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✓ Permite repetir fotos
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between w-full">
          <div className="space-y-1">
            <div className="text-lg font-bold text-gray-900">
              {formatProductPrice(combo.base_price)}
            </div>
            {combo.pricing_type !== 'fixed' && (
              <div className="text-xs text-gray-500">Precio base</div>
            )}
          </div>
          <Button
            onClick={() => onComboSelect(combo)}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Package className="h-4 w-4 mr-1" />
            Seleccionar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h2>
            <p className="text-gray-600">
              Elige los productos perfectos para tus fotos
              {selectedPhotos.length > 0 && ` (${selectedPhotos.length} fotos seleccionadas)`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category.name)}
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularidad</SelectItem>
              <SelectItem value="price_low">Precio: Menor</SelectItem>
              <SelectItem value="price_high">Precio: Mayor</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
            </SelectContent>
          </Select>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="default">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtrar Productos</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Catalog Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-8">
          {/* Featured Combos */}
          {filteredCombos.filter(combo => combo.is_featured).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                Combos Destacados
              </h3>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredCombos
                  .filter(combo => combo.is_featured)
                  .map(combo => <ComboCard key={combo.id} combo={combo} />)}
              </div>
            </div>
          )}

          <Separator />

          {/* All Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-purple-500" />
              Productos Individuales
            </h3>
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="products">
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1 md:grid-cols-2'
          }`}>
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="combos">
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredCombos.map(combo => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredProducts.length === 0 && filteredCombos.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-600 mb-6">
            Intenta ajustar los filtros o el término de búsqueda
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setFilters({ is_active: true });
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}