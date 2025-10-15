/**
 * 🔧 Botón de emergencia para arreglar scroll
 * Se muestra solo cuando hay problemas de scroll detectados
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const EmergencyScrollFix: React.FC = () => {
  const [scrollIssue, setScrollIssue] = useState(false);
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const body = document.body;
      const hasModalOpen = body.classList.contains('modal-open');
      const overflowHidden = window.getComputedStyle(body).overflow === 'hidden';

      setScrollIssue(hasModalOpen || overflowHidden);
    };

    // Verificar inmediatamente
    checkScroll();

    // Verificar cada 2 segundos
    const interval = setInterval(checkScroll, 2000);

    return () => clearInterval(interval);
  }, []);

  const fixScroll = () => {
    const body = document.body;

    // Remover clase modal-open
    body.classList.remove('modal-open');

    // Restaurar estilos
    body.style.overflow = '';
    body.style.position = '';
    body.style.width = '';
    body.style.top = '';
    body.style.left = '';

    // Cerrar cualquier modal abierto
    const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('button[aria-label*="cerrar"], button[aria-label*="close"], [data-testid*="close"]');
      if (closeButton instanceof HTMLElement) {
        closeButton.click();
      }
    });

    setFixed(true);
    setTimeout(() => setScrollIssue(false), 1000);
  };

  if (!scrollIssue && !fixed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-lg shadow-lg border",
        fixed
          ? "bg-green-50 border-green-200"
          : "bg-yellow-50 border-yellow-200"
      )}>
        {fixed ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-800">Scroll restaurado</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-yellow-800">
                Problema de scroll detectado
              </span>
              <Button
                size="sm"
                onClick={fixScroll}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Arreglar scroll
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
