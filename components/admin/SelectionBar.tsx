'use client';

import { Button } from '@/components/ui/button';

type SelectionBarProps = {
  count: number;
  onMove?: () => void;
  onAssign?: () => void;
  onPublish?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
};

export function SelectionBar({
  count,
  onMove,
  onAssign,
  onPublish,
  onDownload,
  onDelete,
}: SelectionBarProps) {
  if (!count) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 lg:left-80">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-4">
        <span className="text-sm text-gray-700">
          <strong>{count}</strong> seleccionada{count === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onMove}>
            Mover
          </Button>
          <Button variant="secondary" onClick={onAssign}>
            Asignar
          </Button>
          <Button variant="secondary" onClick={onPublish}>
            Publicar
          </Button>
          <Button variant="ghost" onClick={onDownload}>
            Descargar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SelectionBar;
