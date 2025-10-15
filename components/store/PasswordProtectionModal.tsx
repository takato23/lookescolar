'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, ShoppingBag, AlertTriangle, Timer } from 'lucide-react';

interface PasswordProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  error?: string | null;
  brandName?: string;
  welcomeMessage?: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300000; // 5 minutes in milliseconds

export function PasswordProtectionModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  brandName = 'LookEscolar',
  welcomeMessage
}: PasswordProtectionModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout>();

  // Load lockout state from localStorage
  useEffect(() => {
    const storedLockoutEnd = localStorage.getItem('passwordLockoutEnd');
    if (storedLockoutEnd) {
      const endTime = parseInt(storedLockoutEnd);
      if (endTime > Date.now()) {
        setIsLocked(true);
        setLockoutEndTime(endTime);
      } else {
        localStorage.removeItem('passwordLockoutEnd');
        localStorage.removeItem('passwordAttempts');
      }
    }

    const storedAttempts = localStorage.getItem('passwordAttempts');
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts));
    }
  }, []);

  // Update remaining time display
  useEffect(() => {
    if (isLocked && lockoutEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = lockoutEndTime - now;

        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutEndTime(null);
          setAttempts(0);
          setRemainingTime('');
          localStorage.removeItem('passwordLockoutEnd');
          localStorage.removeItem('passwordAttempts');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isLocked, lockoutEndTime]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle failed attempt
  useEffect(() => {
    if (error && error.toLowerCase().includes('incorrecta')) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('passwordAttempts', newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutEnd = Date.now() + LOCKOUT_DURATION;
        setIsLocked(true);
        setLockoutEndTime(lockoutEnd);
        localStorage.setItem('passwordLockoutEnd', lockoutEnd.toString());
      }
    }
  }, [error, attempts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || isLocked) return;

    setIsSubmitting(true);
    try {
      await onSubmit(password.trim());
      // Reset attempts on successful submission
      if (!error) {
        setAttempts(0);
        localStorage.removeItem('passwordAttempts');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password.trim() && !isLocked) {
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950/30">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Acceso Protegido
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {brandName}
              </DialogDescription>
            </div>
          </div>
          
          {welcomeMessage && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-gray-700">{welcomeMessage}</p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-900">
              Contraseña de Acceso
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLocked ? "Acceso bloqueado temporalmente" : "Ingresa la contraseña"}
                className={`pr-10 ${isLocked ? 'opacity-50' : ''}`}
                autoFocus={!isLocked}
                disabled={isSubmitting || isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isSubmitting || isLocked}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Lockout Alert */}
          {isLocked && (
            <Alert className="border-amber-200 bg-amber-50">
              <Timer className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Demasiados intentos fallidos. Intenta nuevamente en {remainingTime}
              </AlertDescription>
            </Alert>
          )}

          {/* Attempts Warning */}
          {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Intentos restantes: {MAX_ATTEMPTS - attempts}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && !isLocked && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={!password.trim() || isSubmitting || isLocked}
              className="flex-1"
            >
              {isLocked ? (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Bloqueado
                </div>
              ) : isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Acceder a la Tienda
                </div>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Esta galería está protegida con contraseña.
            <br />
            Contacta con el organizador si no tienes acceso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}