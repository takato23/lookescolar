'use client';

import { ReactNode } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  MessageCircle,
  Wallet,
  Landmark,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

interface CheckoutPaymentMethod {
  id: string;
  title: string;
  description?: string;
  helper?: string;
  badge?: string;
  tone?: 'primary' | 'whatsapp' | 'cash' | 'neutral' | 'accent';
  fee?: number;
}

interface CheckoutPaymentMethodsProps {
  methods: CheckoutPaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const toneConfig: Record<NonNullable<CheckoutPaymentMethod['tone']>, string> = {
  primary: 'bg-primary/10 text-primary-700 border-primary/30',
  whatsapp: 'bg-[#D1FADF] text-[#05603A] border-[#8DDFA9]/50',
  cash: 'bg-[#FDE68A]/60 text-[#92400E] border-[#F59E0B]/40',
  neutral: 'bg-muted/60 text-foreground border-muted/70',
  accent: 'bg-accent/20 text-accent-foreground border-accent/40',
};

function resolveIcon(tone: CheckoutPaymentMethod['tone'], id: string): ReactNode {
  if (tone === 'whatsapp') return <MessageCircle className="h-5 w-5" />;
  if (tone === 'cash') return <Wallet className="h-5 w-5" />;
  if (id.includes('transfer')) return <Landmark className="h-5 w-5" />;
  if (id.includes('qr') || tone === 'accent') return <Smartphone className="h-5 w-5" />;
  return <CreditCard className="h-5 w-5" />;
}

export function CheckoutPaymentMethods({
  methods,
  selectedId,
  onSelect,
  disabled,
}: CheckoutPaymentMethodsProps) {
  if (methods.length === 0) {
    return (
      <section className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-destructive shadow-soft">
        <h2 className="text-lg font-semibold">Métodos de pago no disponibles</h2>
        <p className="mt-2 text-sm text-destructive/80">
          Todavía no habilitamos cobros online para esta tienda. Escribinos por WhatsApp y te ayudamos a completar el pedido.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-soft backdrop-blur-sm sm:p-6 lg:p-8">
      <header className="mb-5 space-y-2">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
          Elegí cómo querés pagar
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirmá tu método preferido. Si necesitás otra opción, hablá con nuestro equipo y buscamos la mejor alternativa.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {methods.map((method) => {
          const isActive = method.id === selectedId;
          const tone = method.tone ?? 'neutral';
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id)}
              disabled={disabled}
              className={cn(
                'group flex h-full flex-col gap-3 rounded-2xl border bg-surface p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/15'
                  : 'border-muted hover:border-primary/40 hover:bg-primary/5'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl border text-base font-semibold',
                    toneConfig[tone]
                  )}
                  aria-hidden
                >
                  {resolveIcon(method.tone, method.id)}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground sm:text-base">
                      {method.title}
                    </span>
                    {method.badge ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-700">
                        {method.badge}
                      </span>
                    ) : null}
                  </div>
                  {method.description ? (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {method.description}
                    </p>
                  ) : null}
                  {typeof method.fee === 'number' ? (
                    <p className="mt-1 text-xs font-medium text-accent-foreground">
                      Costo adicional: {formatCurrency(method.fee)}
                    </p>
                  ) : null}
                </div>
                <CheckCircle2
                  className={cn(
                    'h-5 w-5 text-primary transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </div>
              {method.helper ? (
                <p className="text-xs text-muted-foreground/80">{method.helper}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export type { CheckoutPaymentMethod };

