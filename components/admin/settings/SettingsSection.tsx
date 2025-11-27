'use client';

import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { LucideIcon, ChevronDown, Save } from 'lucide-react';

export interface SettingsSectionProps {
  /**
   * Section identifier
   */
  id: string;

  /**
   * Section title
   */
  title: string;

  /**
   * Section description
   */
  description?: string;

  /**
   * Icon component
   */
  icon?: LucideIcon;

  /**
   * Section content
   */
  children: ReactNode;

  /**
   * Whether the section is collapsible
   */
  collapsible?: boolean;

  /**
   * Default collapsed state
   */
  defaultCollapsed?: boolean;

  /**
   * Whether the section has a save button
   */
  hasSaveButton?: boolean;

  /**
   * Save button handler
   */
  onSave?: () => void | Promise<void>;

  /**
   * Save button loading state
   */
  isSaving?: boolean;

  /**
   * Save button disabled state
   */
  isSaveDisabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Header CSS classes
   */
  headerClassName?: string;

  /**
   * Content CSS classes
   */
  contentClassName?: string;

  /**
   * Custom save button text
   */
  saveButtonText?: string;
}

export function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  hasSaveButton = true,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  className,
  headerClassName,
  contentClassName,
  saveButtonText = 'Guardar',
}: SettingsSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const handleSave = async () => {
    if (onSave && !isSaving && !isSaveDisabled) {
      await onSave();
    }
  };

  return (
    <div
      id={id}
      className={clsx(
        'liquid-glass-intense overflow-hidden rounded-3xl border border-white/12 shadow-[0_36px_120px_-48px_rgba(16,24,40,0.55)]',
        className
      )}
      data-liquid-tone="muted"
    >
      {/* Header */}
      <div
        className={clsx(
          'flex flex-col gap-2 p-8',
          collapsible && 'cursor-pointer select-none',
          headerClassName
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <Icon className="h-6 w-6" />
              </div>
            )}
            {title}
          </h2>

          {collapsible && (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              aria-label={isCollapsed ? 'Expandir sección' : 'Contraer sección'}
            >
              <ChevronDown
                className={clsx(
                  'h-5 w-5 transition-transform duration-300',
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                )}
              />
            </button>
          )}
        </div>

        {description && (
          <p className="text-base text-slate-600 dark:text-slate-300">
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      {(!collapsible || !isCollapsed) && (
        <>
          <div className={clsx('px-8 pb-8', contentClassName)}>
            {children}
          </div>

          {/* Save Button */}
          {hasSaveButton && onSave && (
            <div className="border-t border-white/10 p-6">
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isSaveDisabled}
                  className={clsx(
                    'btn-primary min-w-[120px] flex items-center justify-center gap-2',
                    (isSaving || isSaveDisabled) &&
                      'cursor-not-allowed opacity-60'
                  )}
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {saveButtonText}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SettingsSection;
