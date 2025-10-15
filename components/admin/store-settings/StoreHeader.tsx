/**
 * 📋 Cabecera premium del panel de configuración
 * Muestra título, descripción y controles de guardado
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreHeaderProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  hasChanges,
  isSaving,
  onSave,
  onReset
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-semibold text-foreground">
          Configuración de Tienda
        </h3>
        <p className="text-muted-foreground0 dark:text-muted-foreground">
          Configura productos y precios para el evento
        </p>
      </div>
      <div className="flex items-center gap-3">
        {hasChanges && (
          <Badge variant="outline" className="text-primary-600 border-primary-200">
            Cambios sin guardar
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isSaving}
          aria-label="Resetear cambios"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetear
        </Button>
        <Button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          aria-label={isSaving ? 'Guardando configuración...' : 'Guardar configuración'}
          className={cn(
            "transition-all duration-200",
            hasChanges && !isSaving && "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl",
            isSaving && "bg-blue-400 cursor-not-allowed",
            !hasChanges && "bg-muted cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
