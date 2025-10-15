'use client';

import { useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CheckoutOrderItem {
  id: string;
  name: string;
  quantity: number;
  totalCents: number;
}

interface CheckoutOrderSummaryProps {
  items: CheckoutOrderItem[];
  totalCents: number;
  currency?: string;
  note?: string;
  savingsCents?: number;
  savingsLabel?: string;
  className?: string;
  variant?: 'desktop' | 'mobile';
  onEdit?: () => void;
}

function renderItems(items: CheckoutOrderItem[]) {
  return (
    <ul className="divide-y divide-border/70">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground sm:text-base">
              {item.name}
            </span>
            <span className="text-xs text-primary font-semibold">×{item.quantity}</span>
          </div>
          <span className="text-sm font-semibold text-foreground sm:text-base">
            {formatCurrency(item.totalCents / 100)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CheckoutOrderSummary({
  items,
  totalCents,
  note,
  savingsCents,
  savingsLabel = 'Ahorro',
  className,
  variant = 'desktop',
}: CheckoutOrderSummaryProps) {
  const totalAmount = formatCurrency(totalCents / 100);
  const savingsAmount = typeof savingsCents === 'number'
    ? formatCurrency(savingsCents / 100)
    : null;

  if (variant === 'mobile') {
    const [open, setOpen] = useState(false);

    return (
      <div className={cn('fixed inset-x-4 bottom-5 z-30 rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-lg', className)}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen del pedido</span>
            <div className="text-lg font-semibold text-foreground">{totalAmount}</div>
          </div>
          <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full border border-muted transition-transform duration-200', open ? 'rotate-180' : 'rotate-0')}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        {open ? (
          <div className="border-t border-border/70 px-5 pb-4 pt-2">
            {renderItems(items)}
            <div className="mt-4 space-y-2">
              {savingsAmount ? (
                <div className="flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2 text-xs font-medium text-accent-foreground">
                  <span>{savingsLabel}</span>
                  <span>-{savingsAmount}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">{totalAmount}</span>
              </div>
              {note ? (
                <p className="text-xs text-muted-foreground/80">{note}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <aside className={cn('sticky top-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-xl backdrop-blur-sm', className)}>
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tu pedido</h2>
      </header>
      {renderItems(items)}
      <div className="mt-6 space-y-3">
        {savingsAmount ? (
          <div className="flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2 text-xs font-medium text-accent-foreground">
            <span>{savingsLabel}</span>
            <span>-{savingsAmount}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between rounded-2xl bg-primary text-primary-foreground px-4 py-3">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-xl font-semibold">{totalAmount}</span>
        </div>
        {note ? <p className="text-xs text-muted-foreground/80">{note}</p> : null}
      </div>
    </aside>
  );
}

export type { CheckoutOrderItem };

