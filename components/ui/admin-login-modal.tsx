'use client';

import { useState } from 'react';
import { User, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { AdminLoginForm } from '@/components/ui/auth-forms';

interface AdminLoginModalProps {
  onLogin?: (email: string, password: string) => void;
}

export function AdminLoginModal({ onLogin }: AdminLoginModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogin = (email: string, password: string) => {
    if (onLogin) {
      onLogin(email, password);
    }
    setIsOpen(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="default"
          size="sm"
          className="rounded-full border border-transparent bg-[#FF9F6A] px-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#101428] shadow-[0_12px_32px_-18px_rgba(16,24,40,0.3)] transition-transform hover:-translate-y-0.5 hover:bg-[#FF8B4A]"
        >
          <User className="mr-2 h-4 w-4" />
          Admin
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform">
          <div className="relative">
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 rounded-full border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                aria-label="Cerrar modal de login"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>

            <AdminLoginForm onSubmit={handleLogin} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
