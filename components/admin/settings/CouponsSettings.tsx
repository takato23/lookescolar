'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
  Percent,
  DollarSign,
  Truck,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// TYPES
// =============================================================================

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  min_purchase_cents: number;
  max_discount_cents: number | null;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  applies_to_digital: boolean;
  applies_to_physical: boolean;
  created_at: string;
}

interface CouponsSettingsProps {
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CouponsSettings({ className }: CouponsSettingsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 0,
    minPurchaseCents: 0,
    maxDiscountCents: null as number | null,
    maxUses: null as number | null,
    maxUsesPerUser: 1,
    expiresAt: '',
    description: '',
    appliesToDigital: true,
    appliesToPhysical: true,
  });

  // Fetch coupons
  const fetchCoupons = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/coupons?include_expired=true');
      if (response.ok) {
        const data = await response.json();
        setCoupons(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      minPurchaseCents: 0,
      maxDiscountCents: null,
      maxUses: null,
      maxUsesPerUser: 1,
      expiresAt: '',
      description: '',
      appliesToDigital: true,
      appliesToPhysical: true,
    });
    setEditingCoupon(null);
  }, []);

  // Open dialog for new coupon
  const openNewDialog = useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [resetForm]);

  // Open dialog for editing
  const openEditDialog = useCallback((coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === 'fixed' ? coupon.value / 100 : coupon.value,
      minPurchaseCents: coupon.min_purchase_cents,
      maxDiscountCents: coupon.max_discount_cents,
      maxUses: coupon.max_uses,
      maxUsesPerUser: coupon.max_uses_per_user,
      expiresAt: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
      description: coupon.description || '',
      appliesToDigital: coupon.applies_to_digital,
      appliesToPhysical: coupon.applies_to_physical,
    });
    setIsDialogOpen(true);
  }, []);

  // Save coupon
  const saveCoupon = useCallback(async () => {
    if (!formData.code.trim()) {
      toast.error('El codigo es requerido');
      return;
    }

    setSaving(true);
    try {
      const body = {
        code: formData.code,
        type: formData.type,
        value: formData.type === 'fixed' ? formData.value : formData.value,
        minPurchaseCents: formData.minPurchaseCents,
        maxDiscountCents: formData.maxDiscountCents,
        maxUses: formData.maxUses,
        maxUsesPerUser: formData.maxUsesPerUser,
        expiresAt: formData.expiresAt || null,
        description: formData.description || null,
        appliesToDigital: formData.appliesToDigital,
        appliesToPhysical: formData.appliesToPhysical,
      };

      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      const method = editingCoupon ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      toast.success(editingCoupon ? 'Cupon actualizado' : 'Cupon creado');
      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el cupon');
    } finally {
      setSaving(false);
    }
  }, [formData, editingCoupon, resetForm, fetchCoupons]);

  // Toggle coupon active status
  const toggleCouponStatus = useCallback(async (coupon: Coupon) => {
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.is_active }),
      });

      if (!response.ok) throw new Error('Error');

      toast.success(coupon.is_active ? 'Cupon desactivado' : 'Cupon activado');
      fetchCoupons();
    } catch {
      toast.error('Error al cambiar estado del cupon');
    }
  }, [fetchCoupons]);

  // Delete coupon
  const deleteCoupon = useCallback(async (couponId: string) => {
    if (!confirm('Estas seguro de eliminar este cupon?')) return;

    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error');

      toast.success('Cupon eliminado');
      fetchCoupons();
    } catch {
      toast.error('Error al eliminar el cupon');
    }
  }, [fetchCoupons]);

  // Copy code to clipboard
  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Codigo copiado');
  }, []);

  // Format coupon value for display
  const formatCouponValue = (coupon: Coupon) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}%`;
      case 'fixed':
        return formatCurrency(coupon.value);
      case 'free_shipping':
        return 'Envio gratis';
    }
  };

  // Get type icon
  const getTypeIcon = (type: Coupon['type']) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed':
        return <DollarSign className="h-4 w-4" />;
      case 'free_shipping':
        return <Truck className="h-4 w-4" />;
    }
  };

  // Check if coupon is expired
  const isExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false;
    return new Date(coupon.expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Cupones de Descuento</CardTitle>
                <CardDescription>
                  Crea y gestiona cupones promocionales para tus clientes
                </CardDescription>
              </div>
            </div>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cupon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Tag className="h-4 w-4" />
                <span className="text-sm">Cupones activos</span>
              </div>
              <p className="text-2xl font-bold">
                {coupons.filter((c) => c.is_active && !isExpired(c)).length}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Usos totales</span>
              </div>
              <p className="text-2xl font-bold">
                {coupons.reduce((sum, c) => sum + c.uses_count, 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total cupones</span>
              </div>
              <p className="text-2xl font-bold">{coupons.length}</p>
            </div>
          </div>

          {/* Coupons Table */}
          {coupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay cupones creados</p>
              <p className="text-sm">Crea tu primer cupon de descuento</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyCode(coupon.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(coupon.type)}
                          <span className="text-sm capitalize">
                            {coupon.type === 'percentage' && 'Porcentaje'}
                            {coupon.type === 'fixed' && 'Monto fijo'}
                            {coupon.type === 'free_shipping' && 'Envio gratis'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCouponValue(coupon)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {coupon.uses_count}
                          {coupon.max_uses && ` / ${coupon.max_uses}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isExpired(coupon) ? (
                          <Badge variant="secondary">Expirado</Badge>
                        ) : coupon.is_active ? (
                          <Badge variant="default" className="bg-green-600">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(coupon)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleCouponStatus(coupon)}>
                              {coupon.is_active ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteCoupon(coupon.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar cupon' : 'Nuevo cupon'}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? 'Modifica los datos del cupon'
                : 'Crea un nuevo cupon de descuento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Codigo *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="DESCUENTO10"
                className="uppercase"
                disabled={!!editingCoupon}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: value as typeof formData.type,
                    }))
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                    <SelectItem value="free_shipping">Envio gratis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  {formData.type === 'percentage' ? 'Porcentaje' : 'Monto (ARS)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={formData.type === 'percentage' ? 100 : undefined}
                  value={formData.value}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))
                  }
                  disabled={formData.type === 'free_shipping'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPurchase">Compra minima (ARS)</Label>
              <Input
                id="minPurchase"
                type="number"
                min="0"
                value={formData.minPurchaseCents / 100}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minPurchaseCents: Math.round(parseFloat(e.target.value || '0') * 100),
                  }))
                }
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Usos maximos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={formData.maxUses || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxUses: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="Ilimitado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsesPerUser">Usos por usuario</Label>
                <Input
                  id="maxUsesPerUser"
                  type="number"
                  min="1"
                  value={formData.maxUsesPerUser}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxUsesPerUser: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Fecha de expiracion</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descuento de bienvenida"
              />
            </div>

            <div className="space-y-3">
              <Label>Aplica a</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Productos fisicos</span>
                  <Switch
                    checked={formData.appliesToPhysical}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, appliesToPhysical: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Productos digitales</span>
                  <Switch
                    checked={formData.appliesToDigital}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, appliesToDigital: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCoupon} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
