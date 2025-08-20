import OrderManager from '@/components/admin/OrderManager';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Pedidos</span>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="rounded-full p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-gradient mb-2 text-3xl font-bold md:text-4xl">
                  Pedidos
                </h1>
                <p className="text-muted-foreground">
                  Gestiona las ventas y entregas de fotografías
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <Card
          variant="glass"
          className="noise animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <CardContent className="p-8">
            <OrderManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
