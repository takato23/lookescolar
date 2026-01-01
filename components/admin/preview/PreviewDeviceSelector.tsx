'use client';

import { cn } from '@/lib/utils';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceOption {
  id: DeviceType;
  label: string;
  icon: typeof Monitor;
  width: number;
}

const DEVICE_OPTIONS: DeviceOption[] = [
  { id: 'desktop', label: 'Escritorio', icon: Monitor, width: 1280 },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 768 },
  { id: 'mobile', label: 'Movil', icon: Smartphone, width: 375 },
];

interface PreviewDeviceSelectorProps {
  selected: DeviceType;
  onChange: (device: DeviceType) => void;
  className?: string;
}

export function PreviewDeviceSelector({
  selected,
  onChange,
  className,
}: PreviewDeviceSelectorProps) {
  return (
    <div className={cn('flex items-center rounded-lg border bg-muted/50 p-1', className)}>
      {DEVICE_OPTIONS.map((device) => {
        const Icon = device.icon;
        const isSelected = selected === device.id;

        return (
          <button
            key={device.id}
            type="button"
            onClick={() => onChange(device.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              isSelected
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            )}
            title={device.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{device.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function getDeviceWidth(device: DeviceType): number {
  return DEVICE_OPTIONS.find((d) => d.id === device)?.width || 1280;
}

export { DEVICE_OPTIONS };
