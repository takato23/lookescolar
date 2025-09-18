'use client';

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Store, ShoppingBag, CreditCard, Palette, Shield, Sparkles } from 'lucide-react';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/query-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { useStoreSettings } from '@/lib/hooks/useStoreSettings';
import type { PaymentMethod } from '@/lib/hooks/useStoreSettings';
import { cn } from '@/lib/utils';

const PAYMENT_CONFIG_LABELS: Record<string, string> = {
  accountNumber: 'Número de cuenta',
  account_number: 'Número de cuenta',
  accountHolder: 'Titular de la cuenta',
  account_holder: 'Titular de la cuenta',
  bankName: 'Nombre del banco',
  bank_name: 'Nombre del banco',
  cbu: 'CBU',
  alias: 'Alias',
  contactPhone: 'Teléfono de contacto',
  contact_phone: 'Teléfono de contacto',
};

const formatConfigLabel = (key: string) => {
  if (PAYMENT_CONFIG_LABELS[key]) {
    return PAYMENT_CONFIG_LABELS[key];
  }

  const spaced = key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  return spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function StoreSettingsView() {
  const search = useSearchParams();
  const eventId = search?.get('eventId');
  const {
    settings,
    loading,
    error,
    isDirty,
    isSaving,
    updateField,
    updateNestedField,
    updateSettings,
    saveSettings,
    reset,
    refetch,
    getActiveProducts,
    totalEnabledProducts,
    formatPrice,
    getCurrencySymbol,
  } = useStoreSettings();

  const activeProducts = getActiveProducts();
  const currencySymbol = getCurrencySymbol();

  const templateOptions = useMemo(
    () => [
      { value: 'pixieset', label: 'Pixieset Clásico' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'modern-minimal', label: 'Minimal Moderno' },
      { value: 'editorial', label: 'Editorial' },
      { value: 'bold-vibrant', label: 'Bold Vibrant' },
      { value: 'premium-photography', label: 'Premium Photography' },
      { value: 'studio-dark', label: 'Studio Dark' },
      { value: 'classic-gallery', label: 'Classic Gallery' },
      { value: 'fashion-editorial', label: 'Fashion Editorial' },
      { value: 'premium-store', label: 'Premium Store' },
    ],
    []
  );

  const currencyOptions = useMemo(
    () => [
      { value: 'ARS', label: 'Peso Argentino (ARS)' },
      { value: 'USD', label: 'Dólar Estadounidense (USD)' },
      { value: 'EUR', label: 'Euro (EUR)' },
      { value: 'BRL', label: 'Real Brasileño (BRL)' },
      { value: 'CLP', label: 'Peso Chileno (CLP)' },
      { value: 'PEN', label: 'Sol Peruano (PEN)' },
      { value: 'COP', label: 'Peso Colombiano (COP)' },
      { value: 'MXN', label: 'Peso Mexicano (MXN)' },
    ],
    []
  );

  const colorFields = useMemo(
    () => [
      { key: 'primary', label: 'Primario' },
      { key: 'secondary', label: 'Secundario' },
      { key: 'accent', label: 'Acento' },
      { key: 'background', label: 'Fondo' },
      { key: 'surface', label: 'Superficie' },
      { key: 'text', label: 'Texto' },
      { key: 'text_secondary', label: 'Texto secundario' },
    ],
    []
  );

  const handleSave = useCallback(async () => {
    await saveSettings();
  }, [saveSettings]);

  const handleTemplateChange = useCallback(
    (value: string) => {
      updateSettings({
        template: value as typeof settings.template,
        theme_customization: {
          ...settings.theme_customization,
          template_variant: value,
        },
      });
    },
    [settings.template, settings.theme_customization, updateSettings]
  );

  const handleProductToggle = useCallback(
    (productId: string, enabled: boolean) => {
      updateSettings({
        products: {
          ...(settings.products || {}),
          [productId]: {
            ...(settings.products?.[productId] || {}),
            enabled,
          },
        },
      });
    },
    [settings.products, updateSettings]
  );

  const handleProductPriceChange = useCallback(
    (productId: string, price: number) => {
      if (Number.isNaN(price)) return;
      updateSettings({
        products: {
          ...(settings.products || {}),
          [productId]: {
            ...(settings.products?.[productId] || {}),
            price,
          },
        },
      });
    },
    [settings.products, updateSettings]
  );

  const handlePaymentToggle = useCallback(
    (methodId: string, enabled: boolean) => {
      updateSettings({
        payment_methods: {
          ...(settings.payment_methods || {}),
          [methodId]: {
            ...(settings.payment_methods?.[methodId] || {}),
            enabled,
          },
        },
      });
    },
    [settings.payment_methods, updateSettings]
  );

  const handlePaymentMethodChange = useCallback(
    (methodId: string, updates: Partial<PaymentMethod>) => {
      updateSettings({
        payment_methods: {
          ...(settings.payment_methods || {}),
          [methodId]: {
            ...(settings.payment_methods?.[methodId] || {}),
            ...updates,
          },
        },
      });
    },
    [settings.payment_methods, updateSettings]
  );

  const handlePaymentConfigChange = useCallback(
    (methodId: string, key: string, value: string) => {
      const current = settings.payment_methods?.[methodId] || {};
      handlePaymentMethodChange(methodId, {
        config: {
          ...(current.config || {}),
          [key]: value,
        },
      });
    },
    [settings.payment_methods, handlePaymentMethodChange]
  );

  const handlePaymentInstructionsChange = useCallback(
    (methodId: string, value: string) => {
      const instructions = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      handlePaymentMethodChange(methodId, { instructions });
    },
    [handlePaymentMethodChange]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Toaster position="top-right" />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="mb-2 h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[480px] rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Toaster position="top-right" />
        <Alert variant="destructive">
          <AlertTitle>Error al cargar la configuración</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'No se pudo obtener la configuración de la tienda.'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  const paymentMethods = settings.payment_methods || {};
  const products = settings.products || {};

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-12 sm:p-6">
      <Toaster position="top-right" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Configuración de Tienda
              </h1>
              <p className="text-sm text-muted-foreground">
                Administra la experiencia de compra, productos y pagos para tus galerías.
              </p>
            </div>
          </div>
          {eventId ? (
            <Alert className="mt-2 border-blue-200 bg-blue-50 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
              <AlertTitle>Contexto de evento</AlertTitle>
              <AlertDescription>
                Estás configurando la tienda global. Para ajustar precios específicos del evento {eventId}, administra los productos desde el panel del evento.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              Cambios sin guardar
            </Badge>
          ) : null}
          <Button
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isSaving}
          >
            Restablecer
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {settings.enabled ? 'Tienda publicada' : 'Tienda desactivada'}
              </p>
              <p className="text-xs text-muted-foreground">
                Visible para familias y estudiantes
              </p>
            </div>
            <div className={cn('rounded-full p-3', settings.enabled ? 'bg-green-50 text-green-600' : 'bg-muted text-muted-foreground')}>
              <ShoppingBag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Productos activos</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {totalEnabledProducts()}
              </p>
              <p className="text-xs text-muted-foreground">
                De {Object.keys(products).length} configurados
              </p>
            </div>
            <div className="rounded-full bg-purple-50 p-3 text-purple-600">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Plantilla</p>
              <p className="mt-1 text-xl font-semibold text-foreground capitalize">
                {settings.template.replace('-', ' ')}
              </p>
              <p className="text-xs text-muted-foreground">Personaliza la apariencia</p>
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <Palette className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pasarelas activas</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {Object.values(paymentMethods).filter((method) => method?.enabled).length}
              </p>
              <p className="text-xs text-muted-foreground">Métodos de pago disponibles</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto rounded-xl border bg-background/60 p-1 shadow-sm">
          <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1">Apariencia</TabsTrigger>
          <TabsTrigger value="products" className="flex-1">Productos</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1">Pagos</TabsTrigger>
          <TabsTrigger value="security" className="flex-1">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Disponibilidad y detalles básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Habilitar tienda</h3>
                  <p className="text-sm text-muted-foreground">
                    Permite mostrar productos y precios a las familias.
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateField('enabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) =>
                      updateField('currency', value as typeof settings.currency)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de bienvenida</Label>
                  <Input
                    placeholder="Mensaje destacado en la tienda"
                    value={settings.welcome_message || ''}
                    onChange={(event) =>
                      updateSettings({ welcome_message: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título destacado</Label>
                  <Input
                    value={settings.texts?.hero_title || ''}
                    onChange={(event) =>
                      updateNestedField('texts', 'hero_title', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={settings.texts?.hero_subtitle || ''}
                    onChange={(event) =>
                      updateNestedField('texts', 'hero_subtitle', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Email de contacto</Label>
                  <Input
                    type="email"
                    placeholder="ventas@tufotografia.com"
                    value={settings.texts?.contact_email || ''}
                    onChange={(event) =>
                      updateNestedField('texts', 'contact_email', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="+54 11 0000 0000"
                    value={settings.texts?.contact_phone || ''}
                    onChange={(event) =>
                      updateNestedField('texts', 'contact_phone', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto de pie de página</Label>
                  <Input
                    value={settings.texts?.footer_text || ''}
                    onChange={(event) =>
                      updateNestedField('texts', 'footer_text', event.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Plantilla y colores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Plantilla visual</Label>
                <Select value={settings.template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((template) => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                {colorFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="h-10 w-14 cursor-pointer rounded-md"
                        value={settings.colors?.[field.key as keyof typeof settings.colors] || '#ffffff'}
                        onChange={(event) =>
                          updateNestedField('colors', field.key as keyof typeof settings.colors, event.target.value)
                        }
                      />
                      <Input
                        value={settings.colors?.[field.key as keyof typeof settings.colors] || ''}
                        onChange={(event) =>
                          updateNestedField('colors', field.key as keyof typeof settings.colors, event.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>CSS personalizado (opcional)</Label>
                <Textarea
                  rows={4}
                  placeholder={'Ejemplo:\n.hero-title { font-weight: 700; }'}
                  value={settings.theme_customization?.custom_css || ''}
                  onChange={(event) =>
                    updateNestedField(
                      'theme_customization',
                      'custom_css',
                      event.target.value
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Productos y precios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(products).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay productos configurados todavía.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(products).map(([productId, product]) => (
                      <TableRow key={productId}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {product?.name || productId}
                            </span>
                            {product?.description ? (
                              <span className="text-xs text-muted-foreground">
                                {product.description}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {product?.type || 'producto'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {currencySymbol}
                            </span>
                            <Input
                              type="number"
                              className="h-9 w-28"
                              value={Number(product?.price ?? 0)}
                              onChange={(event) =>
                                handleProductPriceChange(productId, Number(event.target.value))
                              }
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(Number(product?.price ?? 0))}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={Boolean(product?.enabled)}
                            onCheckedChange={(checked) => handleProductToggle(productId, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeProducts.length > 0 ? (
                <Alert className="border-green-200 bg-green-50 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
                  <AlertTitle>Productos destacados</AlertTitle>
                  <AlertDescription>
                    {activeProducts.length} productos visibles. Ajusta precios y estados para controlar la oferta.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Métodos de pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.keys(paymentMethods).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Añade métodos de pago desde la API o la configuración avanzada.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(paymentMethods).map(([methodId, method]) => {
                    const configEntries = Object.entries(method?.config || {});
                    const instructionsValue = method?.instructions?.join('\n') ?? '';

                    return (
                      <div key={methodId} className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {method?.name || methodId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {method?.description || 'Método de pago personalizado'}
                            </p>
                          </div>
                          <Switch
                            checked={Boolean(method?.enabled)}
                            onCheckedChange={(checked) => handlePaymentToggle(methodId, checked)}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`${methodId}-name`}>Nombre visible</Label>
                            <Input
                              id={`${methodId}-name`}
                              value={method?.name ?? ''}
                              onChange={(event) =>
                                handlePaymentMethodChange(methodId, { name: event.target.value })
                              }
                              placeholder="Nombre mostrado al cliente"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`${methodId}-description`}>Descripción</Label>
                            <Input
                              id={`${methodId}-description`}
                              value={method?.description ?? ''}
                              onChange={(event) =>
                                handlePaymentMethodChange(methodId, { description: event.target.value })
                              }
                              placeholder="Resumen breve del método de pago"
                            />
                          </div>

                          {typeof method?.account_details === 'string' ? (
                            <div className="grid gap-2">
                              <Label htmlFor={`${methodId}-account-details`}>
                                Detalles de la cuenta
                              </Label>
                              <Textarea
                                id={`${methodId}-account-details`}
                                value={method?.account_details ?? ''}
                                onChange={(event) =>
                                  handlePaymentMethodChange(methodId, {
                                    account_details: event.target.value,
                                  })
                                }
                                placeholder="Información adicional que se muestra al cliente"
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Se mostrará junto a las instrucciones del método.
                              </p>
                            </div>
                          ) : null}

                          {configEntries.length > 0 ? (
                            <div className="space-y-3">
                              <Separator />
                              <div className="space-y-3">
                                {configEntries.map(([key, value]) => (
                                  <div key={key} className="grid gap-2">
                                    <Label htmlFor={`${methodId}-config-${key}`}>
                                      {formatConfigLabel(key)}
                                    </Label>
                                    <Input
                                      id={`${methodId}-config-${key}`}
                                      value={String(value ?? '')}
                                      onChange={(event) =>
                                        handlePaymentConfigChange(methodId, key, event.target.value)
                                      }
                                    />
                                    {key === 'alias' ? (
                                      <p className="text-xs text-muted-foreground">
                                        Alias bancario para transferencias.
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-2">
                            <Label htmlFor={`${methodId}-instructions`}>Instrucciones</Label>
                            <Textarea
                              id={`${methodId}-instructions`}
                              value={instructionsValue}
                              onChange={(event) =>
                                handlePaymentInstructionsChange(methodId, event.target.value)
                              }
                              placeholder="Escribe cada instrucción en una línea nueva"
                              rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                              Se mostrarán al cliente como lista paso a paso.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Seguridad y acceso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Proteger con contraseña</h3>
                  <p className="text-sm text-muted-foreground">
                    Requiere una contraseña global para visualizar la tienda.
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.password_protection)}
                  onCheckedChange={(checked) =>
                    updateSettings({ password_protection: checked })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contraseña de la tienda</Label>
                  <Input
                    type="text"
                    placeholder="••••••"
                    value={settings.store_password || ''}
                    onChange={(event) =>
                      updateSettings({ store_password: event.target.value })
                    }
                    disabled={!settings.password_protection}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje para invitados</Label>
                  <Input
                    placeholder="Solicita acceso al fotógrafo para ver la tienda"
                    value={settings.store_schedule?.maintenance_message || ''}
                    onChange={(event) =>
                      updateSettings({
                        store_schedule: {
                          ...(settings.store_schedule || {}),
                          maintenance_message: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Inicio de disponibilidad</Label>
                  <Input
                    type="datetime-local"
                    value={settings.store_schedule?.start_date || ''}
                    onChange={(event) =>
                      updateSettings({
                        store_schedule: {
                          ...(settings.store_schedule || {}),
                          start_date: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin de disponibilidad</Label>
                  <Input
                    type="datetime-local"
                    value={settings.store_schedule?.end_date || ''}
                    onChange={(event) =>
                      updateSettings({
                        store_schedule: {
                          ...(settings.store_schedule || {}),
                          end_date: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Input
                    placeholder="America/Argentina/Buenos_Aires"
                    value={settings.store_schedule?.timezone || ''}
                    onChange={(event) =>
                      updateSettings({
                        store_schedule: {
                          ...(settings.store_schedule || {}),
                          timezone: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StoreSettingsPage() {
  return (
    <QueryProvider>
      <StoreSettingsView />
    </QueryProvider>
  );
}
