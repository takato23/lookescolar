'use client';

import { Fragment } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CheckoutField, CheckoutFormData } from './CheckoutValidation';

interface CheckoutCustomerFormProps {
  value: CheckoutFormData;
  errors: Partial<Record<CheckoutField, string>>;
  onFieldChange: <T extends CheckoutField>(field: T, value: CheckoutFormData[T]) => void;
  onFieldBlur?: (field: CheckoutField) => void;
  disabled?: boolean;
}

const deliveryOptions = [
  {
    value: 'school' as const,
    title: 'Entrega en el colegio',
    description: 'Coordinamos con el establecimiento para que llegue directo al aula.',
    icon: '🏫',
  },
  {
    value: 'pickup' as const,
    title: 'Retiro en estudio',
    description: 'Te avisamos por WhatsApp para coordinar día y horario.',
    icon: '📍',
  },
  {
    value: 'digital' as const,
    title: 'Entrega digital',
    description: 'Recibís los archivos en tu correo y acceso al aula virtual.',
    icon: '💻',
  },
];

export function CheckoutCustomerForm({
  value,
  errors,
  onFieldChange,
  onFieldBlur,
  disabled,
}: CheckoutCustomerFormProps) {
  const handleBlur = (field: CheckoutField) => {
    onFieldBlur?.(field);
  };

  return (
    <section className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-soft backdrop-blur-sm sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            Datos del responsable
          </h2>
          <p className="text-sm text-muted-foreground">
            Usamos esta información para coordinar la entrega y enviarte avisos importantes.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
          Información segura
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="guardianName">Nombre del responsable *</Label>
          <Input
            id="guardianName"
            value={value.guardianName}
            onChange={(event) => onFieldChange('guardianName', event.target.value)}
            onBlur={() => handleBlur('guardianName')}
            disabled={disabled}
            placeholder="Ej: Mariana Pérez"
            className={cn(
              'h-12 rounded-xl border border-muted bg-background px-4 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.guardianName ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.guardianName ? (
            <p className="text-xs font-medium text-destructive">{errors.guardianName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardianEmail">Correo electrónico *</Label>
          <Input
            id="guardianEmail"
            type="email"
            value={value.guardianEmail}
            onChange={(event) => onFieldChange('guardianEmail', event.target.value)}
            onBlur={() => handleBlur('guardianEmail')}
            disabled={disabled}
            placeholder="nombre@correo.com"
            className={cn(
              'h-12 rounded-xl border border-muted bg-background px-4 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.guardianEmail ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.guardianEmail ? (
            <p className="text-xs font-medium text-destructive">{errors.guardianEmail}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="guardianPhone">Teléfono de contacto</Label>
          <Input
            id="guardianPhone"
            type="tel"
            value={value.guardianPhone}
            onChange={(event) => onFieldChange('guardianPhone', event.target.value)}
            onBlur={() => handleBlur('guardianPhone')}
            disabled={disabled}
            placeholder="Ej: +54 11 5555-5555"
            className={cn(
              'h-12 rounded-xl border border-muted bg-background px-4 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.guardianPhone ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.guardianPhone ? (
            <p className="text-xs font-medium text-destructive">{errors.guardianPhone}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Opcional, nos ayuda a confirmar la entrega.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="studentName">Alumno/a *</Label>
          <Input
            id="studentName"
            value={value.studentName}
            onChange={(event) => onFieldChange('studentName', event.target.value)}
            onBlur={() => handleBlur('studentName')}
            disabled={disabled}
            placeholder="Nombre y apellido"
            className={cn(
              'h-12 rounded-xl border border-muted bg-background px-4 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.studentName ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.studentName ? (
            <p className="text-xs font-medium text-destructive">{errors.studentName}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="studentGrade">Curso / Sala *</Label>
          <Input
            id="studentGrade"
            value={value.studentGrade}
            onChange={(event) => onFieldChange('studentGrade', event.target.value)}
            onBlur={() => handleBlur('studentGrade')}
            disabled={disabled}
            placeholder="Ej: Sala de 5 · Rojo"
            className={cn(
              'h-12 rounded-xl border border-muted bg-background px-4 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.studentGrade ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.studentGrade ? (
            <p className="text-xs font-medium text-destructive">{errors.studentGrade}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas para el equipo</Label>
          <Textarea
            id="notes"
            value={value.notes ?? ''}
            onChange={(event) => onFieldChange('notes', event.target.value)}
            onBlur={() => handleBlur('notes')}
            disabled={disabled}
            placeholder="¿Hay algo importante que debamos saber?"
            rows={3}
            className={cn(
              'min-h-[3rem] rounded-xl border border-muted bg-background px-4 py-3 text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/60',
              errors.notes ? 'border-destructive focus-visible:ring-destructive/60' : 'focus-visible:border-primary'
            )}
          />
          {errors.notes ? (
            <p className="text-xs font-medium text-destructive">{errors.notes}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Hasta 400 caracteres.</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-3">
          <span className="text-sm font-semibold text-foreground">¿Cómo preferís recibir tu pedido?</span>
          <div className="grid gap-3 sm:grid-cols-3">
            {deliveryOptions.map((option) => {
              const isActive = value.deliveryPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFieldChange('deliveryPreference', option.value)}
                  onBlur={() => handleBlur('deliveryPreference')}
                  disabled={disabled}
                  className={cn(
                    'group flex h-full flex-col rounded-2xl border border-muted bg-surface p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'hover:border-primary/40 hover:bg-primary/5'
                  )}
                >
                  <span className="text-2xl" aria-hidden>{option.icon}</span>
                  <span className="mt-2 text-sm font-semibold text-foreground">
                    {option.title}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
          {errors.deliveryPreference ? (
            <p className="text-xs font-medium text-destructive">{errors.deliveryPreference}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-muted bg-surface p-4">
          <Checkbox
            id="acceptPolicies"
            checked={value.acceptPolicies}
            onCheckedChange={(checked) => onFieldChange('acceptPolicies', Boolean(checked))}
            onBlur={() => handleBlur('acceptPolicies')}
            disabled={disabled}
            className="mt-1 h-5 w-5 rounded-md"
          />
          <div className="text-sm text-muted-foreground">
            <label htmlFor="acceptPolicies" className="cursor-pointer">
              Acepto las políticas de LookEscolar y comprendo que el pedido se procesa en base a los datos ingresados.
            </label>
            {errors.acceptPolicies ? (
              <p className="mt-2 text-xs font-medium text-destructive">{errors.acceptPolicies}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

