'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Key,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminLoginFormProps {
  onSubmit?: (email: string, password: string) => void;
}

export function AdminLoginForm({ onSubmit }: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (onSubmit) {
      onSubmit(email, password);
    }

    setIsLoading(false);
  };

  return (
    <Card className="mx-auto w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-lg">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Acceso Administrativo
        </CardTitle>
        <p className="mt-2 text-slate-600">Ingresá a tu panel de control</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="font-medium text-slate-700">
              Email
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@escuela.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-10 focus:border-slate-400 focus:ring-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="admin-password"
              className="font-medium text-slate-700"
            >
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-10 pr-10 focus:border-slate-400 focus:ring-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 font-semibold text-white shadow-lg transition-all duration-300 hover:from-slate-800 hover:to-slate-950 hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                Ingresar al Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <a
            href="#"
            className="text-sm text-slate-600 transition-colors hover:text-slate-800"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

interface ClientAccessFormProps {
  onSubmit?: (token: string) => void;
}

export function ClientAccessForm({ onSubmit }: ClientAccessFormProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (onSubmit) {
      onSubmit(token);
    }

    setIsLoading(false);
  };

  return (
    <Card className="mx-auto w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
          <Key className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Acceso Familiar
        </CardTitle>
        <p className="mt-2 text-slate-600">
          Ingresá tu código para ver las fotos
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="client-token"
              className="font-medium text-slate-700"
            >
              Código de Acceso
            </Label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
              <Input
                id="client-token"
                type="text"
                placeholder="ABC123XYZ"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-center font-mono text-lg tracking-widest focus:border-emerald-400 focus:ring-emerald-400"
                maxLength={9}
                required
              />
            </div>
            <p className="text-center text-xs text-slate-500">
              Encontrá tu código en el papel que te dieron en la escuela
            </p>
          </div>

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-semibold text-white shadow-lg transition-all duration-300 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl"
            disabled={isLoading || token.length < 6}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                Ver mis fotos
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          <p className="text-xs text-slate-500">
            ¿No tenés tu código? Consultá en la escuela
          </p>
          <a
            href="#"
            className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
          >
            ¿Cómo funciona?
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
