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
          variant="ghost"
          size="sm"
          className="font-mono uppercase tracking-wider text-xs hover:bg-gray-100 border border-gray-300 hover:border-gray-400 rounded-none"
        >
          <User className="w-4 h-4 mr-2" />
          Admin
        </Button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
          <div className="relative">
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-12 right-0 text-white hover:text-gray-300 border border-white/20 hover:border-white/40 rounded-none"
                aria-label="Cerrar modal de login"
              >
                <X className="w-4 h-4" />
              </Button>
            </Dialog.Close>
            
            <AdminLoginForm onSubmit={handleLogin} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}