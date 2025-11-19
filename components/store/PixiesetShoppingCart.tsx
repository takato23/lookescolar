'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ShoppingBag,
  ArrowLeft,
  Plus,
  Minus,
  X,
  CreditCard,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  photoId: string;
  image?: string;
  description?: string;
}

interface PixiesetShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
  onSignUp?: () => void;
  settings?: StoreSettings;
  className?: string;
}

export function PixiesetShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onContinueShopping,
  settings,
  className,
}: PixiesetShoppingCartProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings?.currency || 'ARS',
      minimumFractionDigits: 0,
    }).format(price / 100);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  const handleSupport = () => {
    const message = `¡Hola! Necesito ayuda con mi pedido LookEscolar.\n\nCarrito:\n${items
      .map(
        (item) => `• ${item.name} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`
      )
      .join('\n')}\n\nTotal: ${formatPrice(total)}.`;

    window.open(`https://wa.me/541112345678?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className={cn('looke-store min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100', className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 dark:border-slate-800/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Tu Carrito</h1>
              <p className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? 'item' : 'items'} seleccionados
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onContinueShopping}
            className="group text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Seguir comprando
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        {/* Cart Items List */}
        <section className="space-y-6">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-16 text-center backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div className="mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
                  <ShoppingBag className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Tu carrito está vacío</h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Explora la galería y selecciona tus fotos favoritas para crear recuerdos únicos.
                </p>
                <Button
                  onClick={onContinueShopping}
                  className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Explorar Galería
                </Button>
              </motion.div>
            ) : (
              items.map((item) => (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="group relative flex flex-col gap-5 rounded-3xl border border-white/40 bg-white/60 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md hover:bg-white/80 dark:border-slate-700/50 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 sm:flex-row sm:items-center"
                >
                  {/* Image */}
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl shadow-inner sm:h-32 sm:w-32 flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300">
                          Digital + Impreso
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      {/* Quantity Controls */}
                      <div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-l-full hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-r-full hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))
            )}
          </AnimatePresence>
        </section>

        {/* Summary Sidebar */}
        <aside className="space-y-6">
          <div className="sticky top-24 rounded-3xl border border-white/40 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Resumen del pedido</h3>
                <p className="text-xs text-muted-foreground">Calculado en tiempo real</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className="font-medium text-green-600">Gratis</span>
              </div>

              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="leading-relaxed">
                    <span className="font-semibold">Garantía de Calidad:</span> Revisamos cada foto manualmente antes de imprimir.
                  </p>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
              </div>

              <Button
                onClick={onCheckout}
                disabled={items.length === 0}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all hover:scale-[1.02]"
              >
                Confirmar Compra
              </Button>

              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
                <ShieldCheck className="h-3 w-3" /> Pago 100% seguro y encriptado
              </p>
            </div>
          </div>

          {/* Support Card */}
          <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-white/60 to-white/30 p-6 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:from-slate-900/60 dark:to-slate-900/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <MessageCircle className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-sm">¿Tenés dudas?</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Estamos en línea para ayudarte con tu compra o selección de fotos.
            </p>
            <Button
              variant="outline"
              className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
              onClick={handleSupport}
            >
              Chat por WhatsApp
            </Button>
          </div>
        </aside>
      </main>

      <footer className="mt-auto border-t border-white/20 bg-white/40 py-6 backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} LookEscolar. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default PixiesetShoppingCart;
