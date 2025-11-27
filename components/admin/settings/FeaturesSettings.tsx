'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings2, Store, CreditCard, Bell, Image, Sparkles } from 'lucide-react';
import { useAdminFeatures, useToggleFeature } from '@/lib/hooks/useTenantFeatures';
import type { FeatureFlag } from '@/lib/services/tenant-features.service';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ReactNode> = {
  store: <Store className="h-5 w-5" />,
  checkout: <CreditCard className="h-5 w-5" />,
  notifications: <Bell className="h-5 w-5" />,
  gallery: <Image className="h-5 w-5" />,
  advanced: <Sparkles className="h-5 w-5" />,
};

const categoryLabels: Record<string, string> = {
  store: 'Tienda',
  checkout: 'Checkout y Pagos',
  notifications: 'Notificaciones',
  gallery: 'Galeria',
  advanced: 'Funciones Avanzadas',
};

export function FeaturesSettings() {
  const { data, isLoading, error } = useAdminFeatures();
  const toggleFeature = useToggleFeature();
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const handleToggle = async (feature: FeatureFlag, currentValue: boolean) => {
    setPendingToggles((prev) => new Set(prev).add(feature));
    try {
      await toggleFeature.mutateAsync({ feature, enabled: !currentValue });
    } catch (error) {
      console.error('Error toggling feature:', error);
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(feature);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Error al cargar la configuracion de funcionalidades
        </CardContent>
      </Card>
    );
  }

  const { config, definitions } = data;

  // Group definitions by category
  const groupedDefinitions = definitions.reduce(
    (acc, def) => {
      if (!acc[def.category]) {
        acc[def.category] = [];
      }
      acc[def.category].push(def);
      return acc;
    },
    {} as Record<string, typeof definitions>
  );

  const categories = Object.keys(groupedDefinitions);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">Funcionalidades</h2>
          <p className="text-sm text-muted-foreground">
            Habilita o deshabilita funcionalidades de tu tienda
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {categories.map((category) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {categoryIcons[category]}
                <CardTitle className="text-lg">{categoryLabels[category] || category}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedDefinitions[category].map((def) => {
                const isEnabled = config[def.key as keyof typeof config] as boolean;
                const isPending = pendingToggles.has(def.key);

                return (
                  <div
                    key={def.key}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-4 transition-colors',
                      isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    )}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={def.key} className="font-medium cursor-pointer">
                          {def.label}
                        </Label>
                        <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                          {isEnabled ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{def.description}</p>
                    </div>
                    <div className="flex items-center">
                      {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          id={def.key}
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(def.key as FeatureFlag, isEnabled)}
                          disabled={toggleFeature.isPending}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default FeaturesSettings;
