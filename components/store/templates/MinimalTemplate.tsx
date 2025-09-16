'use client';

import { useState } from 'react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Heart,
  Eye,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { FolderHierarchyDisplay } from '@/components/store/FolderHierarchyDisplay';
import type { TemplateBaseProps } from '@/lib/types/folder-hierarchy-types';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface MinimalTemplateProps extends TemplateBaseProps {
  settings: StoreSettings;
  photos: Photo[];
  token: string;
}

interface CartItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export function MinimalTemplate({
  settings,
  photos,
  token,
  folderHierarchy,
  onFolderNavigate,
  isNavigatingFolder
}: MinimalTemplateProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);

  const activeProducts = Object.entries(settings.products)
    .filter(([_, product]) => product.enabled)
    .map(([id, product]) => ({ id, ...product }));

  const addToCart = (photoId: string, productId: string) => {
    const product = activeProducts.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const existingItem = prev.find(
        item => item.photoId === photoId && item.productId === productId
      );

      if (existingItem) {
        return prev.map(item =>
          item.photoId === photoId && item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        photoId,
        productId,
        productName: product.name,
        price: product.price,
        quantity: 1,
      }];
    });
  };

  const removeFromCart = (photoId: string, productId: string) => {
    setCart(prev => prev.filter(
      item => !(item.photoId === photoId && item.productId === productId)
    ));
  };

  const updateQuantity = (photoId: string, productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(photoId, productId);
      return;
    }

    setCart(prev => prev.map(item =>
      item.photoId === photoId && item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const toggleFavorite = (photoId: string) => {
    setFavorites(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <header className="border-b border-gray-100 sticky top-0 z-40 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gallery
              </h1>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setShowCart(!showCart)}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-[18px] h-5 text-xs px-1"
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Folder Hierarchy Navigation */}
      {folderHierarchy && (folderHierarchy.childFolders?.length > 0 || folderHierarchy.path?.length > 0) && (
        <div className="container mx-auto px-4 py-4 border-b border-gray-100">
          <FolderHierarchyDisplay
            hierarchy={folderHierarchy}
            onFolderSelect={(folderId, folderName) => {
              if (onFolderNavigate) {
                onFolderNavigate(folderId, folderName);
              }
            }}
            isLoading={isNavigatingFolder}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Products Section */}
          {activeProducts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-lg font-medium text-gray-900 mb-8 text-center">
                Available Products
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {activeProducts.map(product => (
                  <div key={product.id} className="text-center p-6 border border-gray-100 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {product.description}
                    </p>
                    <div className="text-xl font-semibold text-gray-900">
                      {formatPrice(product.price)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Photo Grid */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhoto(photo);
                        }}
                        className="bg-white/90 hover:bg-white border-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                        }}
                        className={
                          favorites.includes(photo.id) 
                            ? 'bg-gray-900 text-white hover:bg-gray-800 border-0' 
                            : 'bg-white/90 hover:bg-white border-0'
                        }
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Favorite indicator */}
                  {favorites.includes(photo.id) && (
                    <div className="absolute top-2 right-2">
                      <Heart className="h-4 w-4 text-gray-900 fill-current" />
                    </div>
                  )}

                  {photo.student && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {photo.student}
                      </p>
                      {photo.subject && (
                        <p className="text-xs text-gray-500 truncate">
                          {photo.subject}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Cart Slide-over */}
      {showCart && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowCart(false)}
          />
          
          {/* Cart Panel */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50">
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Cart</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCart(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-1">Your cart is empty</p>
                    <p className="text-sm text-gray-400">Add photos to get started</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={photos.find(p => p.id === item.photoId)?.url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.photoId, item.productId, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.photoId, item.productId, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium text-gray-900">Total:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                    <Button className="w-full bg-gray-900 hover:bg-gray-800">
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] overflow-hidden w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedPhoto.student || 'Photo'}
                </h3>
                {selectedPhoto.subject && (
                  <p className="text-sm text-gray-500">{selectedPhoto.subject}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.alt}
                  className="w-full h-auto"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Select Product</h4>
                {activeProducts.map(product => (
                  <div key={product.id} className="p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">
                        {product.name}
                      </h5>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {product.description}
                    </p>
                    <Button
                      onClick={() => {
                        addToCart(selectedPhoto.id, product.id);
                        setShowCart(true);
                      }}
                      className="w-full bg-gray-900 hover:bg-gray-800"
                      size="sm"
                    >
                      Add to Cart
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}