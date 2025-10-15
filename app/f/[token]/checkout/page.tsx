'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, CreditCard, Package, User, MapPin, Loader2 } from 'lucide-react';

interface PageProps {
  params: { token: string };
}

export default function CheckoutPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  useEffect(() => {
    // Retrieve checkout data from session
    const data = sessionStorage.getItem('checkoutData');
    if (data) {
      setCheckoutData(JSON.parse(data));
    } else {
      toast.error('No hay productos en el carrito');
      router.back();
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create payment preference
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: checkoutData?.token,
          items: [
            ...checkoutData.packages.map((pkgId: string) => ({
              id: pkgId,
              title: `Paquete ${pkgId}`,
              quantity: 1,
              unit_price: 18500 // Fixed price for demo
            })),
            ...checkoutData.photos.map((photoId: string) => ({
              id: photoId,
              title: `Foto ${photoId}`,
              quantity: 1,
              unit_price: 1200 // Fixed price per photo
            }))
          ],
          payer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: {
              street: formData.address,
              city: formData.city,
              state: formData.state,
              zip_code: formData.zipCode
            }
          }
        })
      });

      const data = await response.json();
      
      if (data.success && data.init_point) {
        // Redirect to Mercado Pago
        window.location.href = data.init_point;
      } else {
        throw new Error(data.error || 'Error al crear la preferencia de pago');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    if (!checkoutData) return 0;
    const packagePrice = checkoutData.packages.length * 18500;
    const photoPrice = checkoutData.photos.length * 1200;
    return packagePrice + photoPrice;
  };

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-pink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-pink-950 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <LiquidGlassButton variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="font-medium text-white">Volver</span>
            </LiquidGlassButton>
            <h1 className="text-3xl font-bold text-white">Finalizar Compra</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <GlassCard intensity="strong" className="p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información de Contacto
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Nombre Completo</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="juan@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-white">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="11 1234-5678"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Dirección de Facturación
                  </h3>

                  <div>
                    <Label htmlFor="address" className="text-white">Dirección</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Av. Corrientes 1234"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-white">Ciudad</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="CABA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-white">Provincia</Label>
                      <Input
                        id="state"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Buenos Aires"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-white">Código Postal</Label>
                      <Input
                        id="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="1414"
                      />
                    </div>
                  </div>

                  <LiquidGlassButton
                    variant="primary"
                    size="lg"
                    liquid
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-5 h-5 mr-2" />
                    )}
                    <span className="font-bold">
                      {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
                    </span>
                  </LiquidGlassButton>
                </form>
              </GlassCard>
            </div>

            {/* Order Summary */}
            <div>
              <GlassCard intensity="strong" className="p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Resumen del Pedido
                </h2>

                <div className="space-y-4">
                  {checkoutData.packages.length > 0 && (
                    <div>
                      <p className="text-white/70 text-sm mb-2">Paquetes</p>
                      {checkoutData.packages.map((pkgId: string) => (
                        <div key={pkgId} className="flex justify-between text-white">
                          <span>{pkgId}</span>
                          <span>{formatCurrency(18500)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {checkoutData.photos.length > 0 && (
                    <div>
                      <p className="text-white/70 text-sm mb-2">Fotos Individuales</p>
                      <div className="flex justify-between text-white">
                        <span>{checkoutData.photos.length} fotos</span>
                        <span>{formatCurrency(checkoutData.photos.length * 1200)}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/20 pt-4">
                    <div className="flex justify-between text-white text-xl font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(getTotalPrice())}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}