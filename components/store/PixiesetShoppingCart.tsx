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
} from 'lucide-react';
import { StoreSettings } from '@/lib/hooks/useStoreSettings';

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
    <div className={cn('looke-store min-h-screen bg-background text-foreground', className)}>
      <header className="border-b border-border/60 bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-foreground">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-semibold">Tu carrito</p>
              <p className="text-sm text-muted-foreground">
                Revisá los paquetes elegidos antes de confirmar la compra.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onContinueShopping} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Seguir viendo fotos
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/70 p-12 text-center shadow-soft">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Aún no agregaste paquetes</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Volvé a la galería y elegí el paquete que mejor se adapte a tu familia.
              </p>
              <Button onClick={onContinueShopping} className="mt-5">
                Buscar paquetes
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition-all sm:flex-row sm:items-center"
              >
                {item.image ? (
                  <div className="relative h-36 w-full overflow-hidden rounded-2xl sm:h-28 sm:w-28">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground sm:h-28 sm:w-28">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                      {item.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cantidad
                      </span>
                      <div className="flex items-center overflow-hidden rounded-full border border-border/80">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="px-4 text-sm font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="h-4 w-4" /> Quitar
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-border bg-card shadow-soft">
            <div className="border-b border-border/60 bg-primary text-primary-foreground rounded-t-3xl px-6 py-5">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                <div>
                  <p className="text-base font-semibold">Resumen del pedido</p>
                  <p className="text-xs text-primary-foreground/70">Todo listo para confirmar tu compra</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Incluye revisión manual</p>
                    <p>
                      Nuestro equipo garantiza la calidad de impresión y ajustes necesarios sin costo adicional.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button onClick={onCheckout} disabled={items.length === 0} className="w-full">
                Confirmar pedido
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">¿Necesitás ayuda?</p>
                <p className="text-xs text-muted-foreground">
                  Estamos disponibles por WhatsApp para acompañarte en el proceso.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={handleSupport}>
              Hablar con LookEscolar
            </Button>
          </div>
        </aside>
      </main>

      <footer className="border-t border-border/60 bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Pago protegido y control de calidad garantizado
          </span>
          <span>© {new Date().getFullYear()} LookEscolar</span>
        </div>
      </footer>
    </div>
  );
}

export default PixiesetShoppingCart;
