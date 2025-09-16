import { ShieldCheck, Lock, CreditCard, Truck } from 'lucide-react';

export function TrustBadges({ className = '' }: { className?: string }) {
  const items = [
    { icon: ShieldCheck, label: 'Compra protegida' },
    { icon: Lock, label: 'Pago 100% seguro' },
    { icon: CreditCard, label: 'Mercado Pago' },
    { icon: Truck, label: 'Envíos a todo el país' },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-4 grid-cols-2 ${className}`}>
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 rounded-md border bg-white dark:bg-gray-900 px-3 py-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4 text-foreground" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}

