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
  Sparkles
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onSubmit) {
      onSubmit(email, password);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
      <CardHeader className="text-center pb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Acceso Administrativo
        </CardTitle>
        <p className="text-slate-600 mt-2">
          Ingresá a tu panel de control
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-slate-700 font-medium">
              Email
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@escuela.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl bg-slate-50/50"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-slate-700 font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-xl bg-slate-50/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Ingresar al Dashboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <a 
            href="#" 
            className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onSubmit) {
      onSubmit(token);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
      <CardHeader className="text-center pb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Key className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Acceso Familiar
        </CardTitle>
        <p className="text-slate-600 mt-2">
          Ingresá tu código para ver las fotos
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client-token" className="text-slate-700 font-medium">
              Código de Acceso
            </Label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="client-token"
                type="text"
                placeholder="ABC123XYZ"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="pl-10 h-12 border-slate-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl bg-slate-50/50 text-center text-lg font-mono tracking-widest"
                maxLength={9}
                required
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Encontrá tu código en el papel que te dieron en la escuela
            </p>
          </div>
          
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            disabled={isLoading || token.length < 6}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Ver mis fotos
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
        
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">
            ¿No tenés tu código? Consultá en la escuela
          </p>
          <a 
            href="#" 
            className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
          >
            ¿Cómo funciona?
          </a>
        </div>
      </CardContent>
    </Card>
  );
}