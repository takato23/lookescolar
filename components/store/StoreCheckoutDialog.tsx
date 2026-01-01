'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PaymentMethodSelector, type PaymentMethod } from '@/components/store/PaymentMethodSelector';
import { cn } from '@/lib/utils';
import type { StoreSettings } from '@/lib/hooks/useStoreSettings';
import { toast } from 'sonner';

export interface StoreCheckoutItem {
  photoId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface StoreCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  settings: StoreSettings;
  cartItems: StoreCheckoutItem[];
  photos?: Array<{ id: string; url: string; alt?: string }>;
  onOrderComplete?: () => void;
  className?: string;
}

interface ContactInfoForm {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

type PaymentMethodDetail = {
  name?: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  benefits?: string[];
  instructions?: string[];
  processingTime?: string;
  badge?: string;
  badgeColor?: string;
};

const emptyContact: ContactInfoForm = {
  name: '',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Argentina',
  },
};

export function StoreCheckoutDialog({
  open,
  onOpenChange,
  token,
  settings,
  cartItems,
  photos = [],
  onOrderComplete,
  className,
}: StoreCheckoutDialogProps) {
  const [contact, setContact] = useState<ContactInfoForm>(emptyContact);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercado_pago');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    orderId: string;
    method: PaymentMethod;
  } | null>(null);

  const paymentConfig = useMemo(() => {
    const rawPaymentMethods =
      (settings as any)?.payment_methods ||
      (settings as any)?.paymentMethods ||
      {};
    const hasPaymentConfig = Object.keys(rawPaymentMethods || {}).length > 0;

    const mpConfig = rawPaymentMethods['mercado-pago'] || rawPaymentMethods['mercado_pago'];
    const bankConfig = rawPaymentMethods['bank-transfer'] || rawPaymentMethods['bank_transfer'];
    const cashConfig =
      rawPaymentMethods['cash'] ||
      rawPaymentMethods['cash-payment'] ||
      rawPaymentMethods['cash_on_delivery'] ||
      rawPaymentMethods['efectivo'];

    const resolveEnabled = (methodConfig: any, fallback: boolean) => {
      if (methodConfig && typeof methodConfig.enabled === 'boolean') {
        return methodConfig.enabled;
      }
      if (methodConfig) {
        return true;
      }
      return fallback;
    };

    const mpConnected = (settings as any)?.mercadoPagoConnected ?? true;
    const mpEnabled = resolveEnabled(mpConfig, true);
    const bankEnabled = resolveEnabled(bankConfig, !hasPaymentConfig);
    const cashEnabled = resolveEnabled(cashConfig, !hasPaymentConfig);

    const formatBankInstructions = (config: Record<string, string | undefined>) => {
      if (!config) return [];
      const labelMap: Record<string, string> = {
        accountNumber: 'Numero de cuenta',
        accountHolder: 'Titular',
        bankName: 'Banco',
        cbu: 'CBU',
        alias: 'Alias',
        clabe: 'CLABE',
      };
      return Object.entries(config)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => {
          const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          return `${label}: ${value}`;
        });
    };

    const bankConfigAny = bankConfig as any;
    const bankInstructions = Array.isArray(bankConfigAny?.instructions)
      ? bankConfigAny.instructions
      : bankConfigAny?.config
      ? formatBankInstructions(bankConfigAny.config)
      : undefined;

    const cashConfigAny = cashConfig as any;
    const cashConfigInstructions = Array.isArray(cashConfigAny?.instructions)
      ? cashConfigAny.instructions
      : Array.isArray(cashConfigAny?.config?.instructions)
      ? cashConfigAny.config.instructions
      : undefined;

    let cashInstructions = cashConfigInstructions?.filter(
      (item: string) => item && item.trim().length > 0
    );

    if (
      (!cashInstructions || cashInstructions.length === 0) &&
      cashConfig?.config &&
      typeof cashConfig.config === 'object'
    ) {
      cashInstructions = Object.entries(cashConfig.config)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .map(([key, value]) => {
          const normalizedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          const label = normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1);
          return `${label}: ${value}`;
        });
    }

    const methodDetails: Partial<Record<PaymentMethod, PaymentMethodDetail>> = {
      mercado_pago: {
        name: mpConfig?.name,
        description: mpConfig?.description,
        icon: mpConfig?.icon,
        enabled: mpEnabled && mpConnected,
      },
      bank_transfer: {
        name: bankConfig?.name,
        description: bankConfig?.description,
        icon: bankConfig?.icon,
        enabled: bankEnabled,
        instructions: bankInstructions && bankInstructions.length > 0 ? bankInstructions : undefined,
      },
      cash: {
        name: cashConfig?.name,
        description: cashConfig?.description,
        icon: cashConfig?.icon,
        enabled: cashEnabled,
        instructions: cashInstructions && cashInstructions.length > 0 ? cashInstructions : undefined,
      },
    };

    const availableMethods: PaymentMethod[] = [];
    if (mpEnabled && mpConnected) availableMethods.push('mercado_pago');
    if (bankEnabled) availableMethods.push('bank_transfer');
    if (cashEnabled) availableMethods.push('cash');

    return {
      availableMethods,
      enabledMethods: {
        mercadoPago: mpEnabled && mpConnected,
        bankTransfer: bankEnabled,
        cash: cashEnabled,
      },
      methodDetails,
    };
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    if (paymentConfig.availableMethods.length === 0) return;
    if (!paymentConfig.availableMethods.includes(paymentMethod)) {
      setPaymentMethod(paymentConfig.availableMethods[0]);
    }
  }, [open, paymentMethod, paymentConfig.availableMethods]);

  useEffect(() => {
    if (!open) {
      setContact(emptyContact);
      setFormError(null);
      setIsSubmitting(false);
      setSuccessInfo(null);
    }
  }, [open]);

  const totalPrice = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings.currency || 'ARS',
    }).format(price);
  };

  const uniquePhotoIds = useMemo(() => {
    const set = new Set<string>();
    cartItems.forEach((item) => set.add(item.photoId));
    return Array.from(set);
  }, [cartItems]);

  const validateContact = () => {
    if (!contact.name.trim()) return 'Ingresa tu nombre completo';
    if (!contact.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) {
      return 'Ingresa un email valido';
    }
    if (!contact.address.street.trim()) return 'Ingresa la calle y numero';
    if (!contact.address.city.trim()) return 'Ingresa la ciudad';
    if (!contact.address.state.trim()) return 'Ingresa la provincia';
    if (!contact.address.zipCode.trim()) return 'Ingresa el codigo postal';
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError('Tu carrito esta vacio.');
      return;
    }

    const validationError = validateContact();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (paymentConfig.availableMethods.length === 0) {
      setFormError('No hay metodos de pago disponibles.');
      return;
    }
    if (!paymentConfig.availableMethods.includes(paymentMethod)) {
      setFormError('Selecciona un metodo de pago disponible.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const orderBase = {
        id: orderId,
        token,
        basePackage: {
          id: 'cart',
          name: 'Compra de fotos',
          basePrice: 0,
        },
        selectedPhotos: {
          individual: uniquePhotoIds,
          group: [],
        },
        additionalCopies: cartItems.map((item) => ({
          id: `${item.productId}_${item.photoId}`,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        contactInfo: contact,
        totalPrice,
      };

      if (paymentMethod === 'mercado_pago') {
        const res = await fetch('/api/store/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: orderBase, callbackBase: 'store-unified' }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo iniciar el pago');
        }

        const data = await res.json();
        if (data?.init_point) {
          window.location.href = data.init_point;
          return;
        }
        if (data?.sandbox_init_point) {
          window.location.href = data.sandbox_init_point;
          return;
        }
        throw new Error('Respuesta invalida del proveedor de pagos');
      }

      const res = await fetch('/api/store/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            ...orderBase,
            paymentMethod,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo crear el pedido');
      }

      setSuccessInfo({ orderId, method: paymentMethod });
      onOrderComplete?.();
      toast.success('Pedido confirmado. Te enviaremos los detalles.');
    } catch (error: any) {
      setFormError(error?.message || 'No pudimos procesar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMethodDetails = paymentConfig.methodDetails[paymentMethod];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-3xl overflow-hidden p-0', className)}>
        <DialogHeader className="border-b border-border/80 bg-muted/30 px-6 py-4">
          <DialogTitle className="text-lg font-semibold">
            Finalizar compra
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Completa tus datos y elegi el metodo de pago.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 py-6 space-y-8">
            {successInfo ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <p className="font-semibold">Pedido confirmado</p>
                  <p className="text-sm text-emerald-800">
                    Numero de pedido: <span className="font-semibold">{successInfo.orderId}</span>
                  </p>
                </div>
                {selectedMethodDetails?.instructions && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Instrucciones para completar el pago
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selectedMethodDetails.instructions.map((instruction, index) => (
                        <li key={`${instruction}-${index}`}>• {instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
              </div>
            ) : (
              <>
                {formError && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Resumen</h3>
                    <Badge variant="outline" className="text-xs">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {cartItems.map((item) => {
                      const photo = photos.find((p) => p.id === item.photoId);
                      return (
                        <div
                          key={`${item.productId}-${item.photoId}`}
                          className="flex items-center justify-between rounded-xl border border-border/80 bg-card/80 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            {photo && (
                              <img
                                src={photo.url}
                                alt={photo.alt || 'Foto'}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Cantidad: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Datos de contacto</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-name">Nombre completo</Label>
                      <Input
                        id="checkout-name"
                        value={contact.name}
                        onChange={(event) =>
                          setContact((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Nombre y apellido"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-email">Email</Label>
                      <Input
                        id="checkout-email"
                        value={contact.email}
                        onChange={(event) =>
                          setContact((prev) => ({ ...prev, email: event.target.value }))
                        }
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-phone">Telefono (opcional)</Label>
                      <Input
                        id="checkout-phone"
                        value={contact.phone}
                        onChange={(event) =>
                          setContact((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        placeholder="+54 11 2345 6789"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="checkout-street">Calle y numero</Label>
                      <Input
                        id="checkout-street"
                        value={contact.address.street}
                        onChange={(event) =>
                          setContact((prev) => ({
                            ...prev,
                            address: { ...prev.address, street: event.target.value },
                          }))
                        }
                        placeholder="Av. Siempre Viva 742"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-city">Ciudad</Label>
                      <Input
                        id="checkout-city"
                        value={contact.address.city}
                        onChange={(event) =>
                          setContact((prev) => ({
                            ...prev,
                            address: { ...prev.address, city: event.target.value },
                          }))
                        }
                        placeholder="Buenos Aires"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-state">Provincia</Label>
                      <Input
                        id="checkout-state"
                        value={contact.address.state}
                        onChange={(event) =>
                          setContact((prev) => ({
                            ...prev,
                            address: { ...prev.address, state: event.target.value },
                          }))
                        }
                        placeholder="CABA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-zip">Codigo postal</Label>
                      <Input
                        id="checkout-zip"
                        value={contact.address.zipCode}
                        onChange={(event) =>
                          setContact((prev) => ({
                            ...prev,
                            address: { ...prev.address, zipCode: event.target.value },
                          }))
                        }
                        placeholder="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-country">Pais</Label>
                      <Input
                        id="checkout-country"
                        value={contact.address.country}
                        onChange={(event) =>
                          setContact((prev) => ({
                            ...prev,
                            address: { ...prev.address, country: event.target.value },
                          }))
                        }
                        placeholder="Argentina"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  totalAmount={totalPrice}
                  enabledMethods={paymentConfig.enabledMethods}
                  methodDetails={paymentConfig.methodDetails}
                />

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting || cartItems.length === 0}
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar pedido'}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
