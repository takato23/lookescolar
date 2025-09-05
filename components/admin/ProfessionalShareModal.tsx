'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  ExternalLink,
  Share2,
  QrCode,
  MessageCircle,
  Mail,
  CheckCircle2,
  X
} from 'lucide-react';

interface ProfessionalShareModalProps {
  url: string;
  title?: string;
  description?: string;
  type?: 'event' | 'folder';
  onClose: () => void;
  isOpen: boolean;
}

export function ProfessionalShareModal({
  url,
  title = 'Galería',
  description = 'Compartir galería de fotos',
  type = 'event',
  onClose,
  isOpen
}: ProfessionalShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setShowQR(false);
    }
  }, [isOpen]);

  const shareText = `Mira las fotos de este ${type === 'event' ? 'evento' : 'álbum'}: ${title}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Show success toast
      try {
        const { toast } = await import('sonner');
        toast.success('Enlace copiado al portapapeles');
      } catch {}
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      try {
        const { toast } = await import('sonner');
        toast.success('Enlace copiado');
      } catch {}
    }
  };

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} Ver aquí: ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`${title} - ${description}`);
    const body = encodeURIComponent(
      `${shareText}\n\nPuedes ver las fotos aquí: ${url}\n\n---\nCompartido desde LookEscolar`
    );
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(); // Fallback
        }
      }
    } else {
      copyToClipboard(); // Fallback
    }
  };

  const generateQRUrl = () => {
    // Using a reliable QR code service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-2xl bg-white/80 border border-white/30 shadow-2xl ring-1 ring-black/5 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:backdrop-blur-3xl before:-z-10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            Compartir {type === 'event' ? 'Evento' : 'Álbum'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title and Description */}
          <div className="text-center">
            <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>

          {/* URL Display */}
          <Card className="bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg ring-1 ring-black/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <code className="flex-1 text-gray-800 break-all font-mono text-xs bg-white/70 backdrop-blur-sm border border-white/60 px-2 py-1 rounded shadow-sm">
                  {url}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Copy Link */}
            <Button
              onClick={copyToClipboard}
              className="flex items-center gap-2 h-12 font-semibold backdrop-blur-sm shadow-lg border-white/30"
              variant={copied ? "default" : "outline"}
              style={copied ? { 
                backgroundColor: '#10b981', 
                color: 'white',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.2)'
              } : { 
                borderColor: '#374151', 
                color: '#374151',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)'
              }}
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copiado!' : 'Copiar Enlace'}
            </Button>

            {/* Open in Same Tab */}
            <Button
              onClick={() => window.location.href = url}
              variant="outline"
              className="flex items-center gap-2 h-12 font-semibold border-blue-300/60 text-blue-700 hover:bg-blue-50/80 backdrop-blur-sm shadow-lg bg-white/10"
              style={{
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px 0 rgba(59, 130, 246, 0.1)'
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Ir al Link
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Compartir en:</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              <Button
                onClick={shareWhatsApp}
                variant="outline"
                className="flex items-center gap-2 h-10 font-semibold border-green-300/60 text-green-700 hover:bg-green-50/80 hover:border-green-400/80 backdrop-blur-sm shadow-md bg-white/5"
                style={{
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 12px 0 rgba(34, 197, 94, 0.08)'
                }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>

              {/* Email */}
              <Button
                onClick={shareEmail}
                variant="outline"
                className="flex items-center gap-2 h-10 font-semibold border-blue-300/60 text-blue-700 hover:bg-blue-50/80 hover:border-blue-400/80 backdrop-blur-sm shadow-md bg-white/5"
                style={{
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 12px 0 rgba(59, 130, 246, 0.08)'
                }}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>

            {/* Native Share (mobile) */}
            {typeof window !== 'undefined' && navigator.share && (
              <Button
                onClick={shareNative}
                variant="outline"
                className="w-full flex items-center gap-2 h-10 font-semibold border-purple-300/60 text-purple-700 hover:bg-purple-50/80 backdrop-blur-sm shadow-md bg-white/5"
                style={{
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 12px 0 rgba(147, 51, 234, 0.08)'
                }}
              >
                <Share2 className="h-4 w-4" />
                Compartir (Sistema)
              </Button>
            )}
          </div>

          {/* QR Code Toggle */}
          <div className="border-t border-white/40 pt-4">
            <Button
              onClick={() => setShowQR(!showQR)}
              variant="ghost"
              className="w-full flex items-center gap-2 font-semibold text-gray-700 hover:bg-gray-100/60 backdrop-blur-sm bg-white/5"
              style={{
                backdropFilter: 'blur(6px)',
                boxShadow: '0 1px 8px 0 rgba(0, 0, 0, 0.04)'
              }}
            >
              <QrCode className="h-4 w-4" />
              {showQR ? 'Ocultar' : 'Mostrar'} Código QR
            </Button>

            {showQR && (
              <div className="mt-4 flex flex-col items-center">
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg border-2 border-white/60 shadow-xl ring-1 ring-gray-100/50">
                  <img
                    src={generateQRUrl()}
                    alt="Código QR para compartir"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Escanea el código para acceder directamente
                </p>
              </div>
            )}
          </div>

          {/* Professional Note */}
          <div className="bg-blue-50/60 backdrop-blur-lg border border-blue-200/70 rounded-lg p-3 shadow-lg ring-1 ring-blue-100/50">
            <p className="text-xs text-blue-700">
              💡 <strong>Para fotógrafos:</strong> Este enlace es ideal para compartir con múltiples familias. 
              Puedes enviarlo por WhatsApp, email o imprimirlo con el código QR.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}