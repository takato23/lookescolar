'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Building2,
  DollarSign,
  Smartphone,
  Info,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export type PaymentMethod = 'mercado_pago' | 'bank_transfer' | 'cash';

type PaymentMethodDetail = {
  name?: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  benefits?: string[];
  instructions?: string[];
  processingTime?: string;
  badge?: string;
  badgeColor?: string;
};

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  totalAmount: number;
  className?: string;
  enabledMethods?: {
    mercadoPago?: boolean;
    bankTransfer?: boolean;
    cash?: boolean;
  };
  methodDetails?: Partial<Record<PaymentMethod, PaymentMethodDetail>>;
}

const ICON_MAP = {
  CreditCard,
  Building2,
  DollarSign,
  Smartphone,
} as const;

type IconKey = keyof typeof ICON_MAP;

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  totalAmount,
  className,
  enabledMethods = {
    mercadoPago: true,
    bankTransfer: true,
    cash: true,
  },
  methodDetails = {},
}: PaymentMethodSelectorProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const defaultEnabledMap: Record<PaymentMethod, boolean> = {
    mercado_pago: enabledMethods.mercadoPago ?? true,
    bank_transfer: enabledMethods.bankTransfer ?? true,
    cash: enabledMethods.cash ?? true,
  };

  const baseMethods = [
    {
      id: 'mercado_pago' as PaymentMethod,
      name: 'Mercado Pago',
      description: 'Pagá con tarjeta o dinero en cuenta',
      iconKey: 'CreditCard' as IconKey,
      color: 'from-blue-500 to-cyan-500',
      benefits: [
        'Pago instantáneo y seguro',
        'Protección de compra',
        'Hasta 12 cuotas sin interés',
        'Confirmación inmediata',
      ],
      processingTime: 'Inmediato',
      badge: 'Recomendado',
      badgeColor: 'bg-blue-500',
    },
    {
      id: 'bank_transfer' as PaymentMethod,
      name: 'Transferencia Bancaria',
      description: 'Transferí directamente a nuestra cuenta',
      iconKey: 'Building2' as IconKey,
      color: 'from-green-500 to-emerald-500',
      benefits: [
        'Sin comisiones adicionales',
        'Comprobante bancario',
        'Ideal para montos grandes',
        'Pago directo',
      ],
      processingTime: '24-48 horas',
      instructions: [
        'CBU: 0000003100019925293912',
        'Alias: LOOKESCOLAR.FOTOS',
        'Titular: Look Escolar S.A.',
        'CUIT: 30-71234567-8',
      ],
    },
    {
      id: 'cash' as PaymentMethod,
      name: 'Efectivo',
      description: 'Coordiná el pago en persona',
      iconKey: 'DollarSign' as IconKey,
      color: 'from-purple-500 to-pink-500',
      benefits: [
        'Sin intermediarios',
        'Recibo en mano',
        'Coordinación directa',
        'Flexibilidad de pago',
      ],
      processingTime: 'A coordinar',
      instructions: [
        'Te contactaremos para coordinar',
        'Pago en el colegio o estudio',
        'Recibo oficial en el momento',
      ],
    },
  ];

  const paymentMethods = baseMethods.map((method) => {
    const details = methodDetails[method.id] ?? {};
    const iconName = (details.icon as IconKey | undefined) ?? method.iconKey;
    const Icon = ICON_MAP[iconName] ?? ICON_MAP.CreditCard;
    return {
      ...method,
      ...details,
      icon: Icon,
      color: method.color,
      benefits: details.benefits ?? method.benefits,
      instructions: details.instructions ?? method.instructions,
      processingTime: details.processingTime ?? method.processingTime,
      badge: details.badge ?? method.badge,
      badgeColor: details.badgeColor ?? method.badgeColor,
      enabled: details.enabled ?? defaultEnabledMap[method.id],
    };
  });

  const selectedPaymentMethod = paymentMethods.find((m) => m.id === selectedMethod);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Elegí tu Método de Pago
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Total a pagar: <span className="font-semibold text-foreground">{formatPrice(totalAmount)}</span>
        </p>
      </div>

      {/* Payment Methods Grid */}
      <RadioGroup value={selectedMethod} onValueChange={(value) => onSelect(value as PaymentMethod)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <label
                key={method.id}
                htmlFor={method.id}
                className={cn(
                  'relative cursor-pointer',
                  !method.enabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Card
                  className={cn(
                    'relative overflow-hidden transition-all duration-300',
                    'hover:shadow-lg hover:scale-[1.02]',
                    isSelected && 'ring-2 ring-primary ring-offset-2',
                    !method.enabled && 'hover:scale-100 hover:shadow-none'
                  )}
                >
                  {/* Badge */}
                  {method.badge && method.enabled && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className={cn(method.badgeColor, 'text-white')}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {method.badge}
                      </Badge>
                    </div>
                  )}

                  {/* Gradient Background */}
                  <div
                    className={cn(
                      'absolute inset-0 opacity-10',
                      `bg-gradient-to-br ${method.color}`
                    )}
                  />

                  <CardContent className="p-6 space-y-4">
                    {/* Radio Input */}
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        disabled={!method.enabled}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        {/* Method Icon and Name */}
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              `bg-gradient-to-br ${method.color}`
                            )}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{method.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {method.description}
                            </p>
                          </div>
                        </div>

                        {/* Processing Time */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <Clock className="h-3 w-3" />
                          <span>{method.processingTime}</span>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-1">
                          {method.benefits?.map((benefit, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>

                        {!method.enabled && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {`Este método está deshabilitado. ${method.id === 'mercado_pago' ? 'Habilitalo desde la configuración de la tienda para ofrecer pagos con tarjeta.' : 'Seleccioná otro método disponible.'}`}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </label>
            );
          })}
        </div>
      </RadioGroup>

      {/* Method Details */}
      {selectedPaymentMethod && (
        <Card className="border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/10">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                  Información de {selectedPaymentMethod.name}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {selectedPaymentMethod.description}
                </p>
              </div>
            </div>

            {selectedPaymentMethod.instructions && selectedPaymentMethod.instructions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                  <Shield className="h-4 w-4" />
                  Instrucciones
                </div>
                <ul className="space-y-2 text-sm text-blue-900/80 dark:text-blue-200/80">
                  {selectedPaymentMethod.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedPaymentMethod.id === 'mercado_pago' && (
              <Alert className="bg-white/60 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/60">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-blue-900/80 dark:text-blue-200/80">
                  Serás redirigido a Mercado Pago para completar el pago. Asegurate de regresar a la tienda para ver la confirmación.
                </AlertDescription>
              </Alert>
            )}

            {selectedPaymentMethod.id !== 'mercado_pago' && (
              <Alert className="bg-white/60 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/60">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-blue-900/80 dark:text-blue-200/80">
                  Confirmá el pedido y recibirás las instrucciones para completar el pago.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Assurance */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-blue-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Compra protegida</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tus datos están seguros. Usamos encriptación de extremo a extremo y trabajamos con proveedores confiables.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Pagos Seguros
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Soporte 24/7
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                Protección de datos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
