'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Heart, Download, Eye, Check, X, Plus, Minus, Search, Filter, Grid3X3, List, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStoreSettings } from '@/lib/hooks/useStoreSettings';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'print' | 'digital' | 'package';
  sizes?: string[];
  inStock: boolean;
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
}

interface PixiesetStoreProps {
  eventId?: string;
  token?: string;
}

export default function PixiesetStore({ eventId, token }: PixiesetStoreProps) {
  const { settings, loading, formatPrice, getActiveProducts } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!loading) {
      setProducts(getActiveProducts());
    }
  }, [loading, settings]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'print' | 'digital' | 'package'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product, size?: string) => {
    const existingItem = cart.find(item => 
      item.id === product.id && item.selectedSize === size
    );

    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id && item.selectedSize === size
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1, selectedSize: size }]);
    }
  };

  const removeFromCart = (productId: string, size?: string) => {
    setCart(cart.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  const updateQuantity = (productId: string, size: string | undefined, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === productId && item.selectedSize === size) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-light tracking-wide">{settings.storeName.toUpperCase()}</h1>
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    selectedCategory === 'all' ? "text-black" : "text-gray-600 hover:text-black"
                  )}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedCategory('print')}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    selectedCategory === 'print' ? "text-black" : "text-gray-600 hover:text-black"
                  )}
                >
                  Impresiones
                </button>
                <button
                  onClick={() => setSelectedCategory('digital')}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    selectedCategory === 'digital' ? "text-black" : "text-gray-600 hover:text-black"
                  )}
                >
                  Digital
                </button>
                <button
                  onClick={() => setSelectedCategory('package')}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    selectedCategory === 'package' ? "text-black" : "text-gray-600 hover:text-black"
                  )}
                >
                  Paquetes
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'grid' ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'list' ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[40vh] bg-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <div className="relative h-full flex items-center justify-center text-center text-white">
          <div>
            <h2 className="text-4xl md:text-5xl font-light mb-4">Colección Premium</h2>
            <p className="text-lg font-light opacity-90">Capturando momentos únicos</p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1"
        )}>
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "group bg-white overflow-hidden",
                viewMode === 'list' && "flex gap-6"
              )}
            >
              <div className={cn(
                "relative overflow-hidden bg-gray-100",
                viewMode === 'grid' ? "aspect-[3/4]" : "w-48 h-48 flex-shrink-0"
              )}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Heart className={cn(
                    "h-4 w-4 transition-colors",
                    favorites.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                  )} />
                </button>

                <button
                  onClick={() => setSelectedProduct(product)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <div className="p-3 bg-white rounded-full shadow-lg">
                    <Eye className="h-5 w-5" />
                  </div>
                </button>
              </div>

              <div className={cn(
                "p-4",
                viewMode === 'list' && "flex-1 flex items-center justify-between"
              )}>
                <div className={cn(
                  viewMode === 'list' && "flex-1"
                )}>
                  <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                  <p className="text-lg font-medium">{formatPrice(product.price)}</p>
                </div>

                <div className={cn(
                  "mt-4",
                  viewMode === 'list' && "mt-0 ml-6"
                )}>
                  {product.sizes ? (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addToCart(product, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Seleccionar tamaño</option>
                      {product.sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
                    >
                      Agregar al carrito
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Shopping Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-medium">Carrito ({cartItemsCount})</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">Tu carrito está vacío</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.selectedSize && (
                              <p className="text-sm text-gray-600">Tamaño: {item.selectedSize}</p>
                            )}
                            <p className="text-sm font-medium mt-1">{formatPrice(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.selectedSize, -1)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.selectedSize, 1)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t p-6">
                    <div className="flex justify-between mb-4">
                      <span className="text-lg">Total</span>
                      <span className="text-lg font-medium">{formatPrice(cartTotal)}</span>
                    </div>
                    <button className="w-full py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors">
                      Proceder al pago
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/80 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 md:inset-12 bg-white rounded-lg overflow-hidden z-50"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid md:grid-cols-2 h-full">
                <div className="bg-gray-100 h-full" />
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <h2 className="text-3xl font-light mb-4">{selectedProduct.name}</h2>
                  <p className="text-gray-600 mb-6">{selectedProduct.description}</p>
                  <p className="text-2xl font-medium mb-8">{formatPrice(selectedProduct.price)}</p>
                  
                  {selectedProduct.sizes ? (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addToCart(selectedProduct, e.target.value);
                          setSelectedProduct(null);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded mb-4"
                    >
                      <option value="">Seleccionar tamaño</option>
                      {selectedProduct.sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="w-full py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Agregar al carrito
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}