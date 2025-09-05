"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type ShareScope = 'event' | 'folder' | 'photos';

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope: ShareScope;
  eventId?: string;
  folderId?: string;
  photoIds?: string[];
  defaultTitle?: string;
  defaultDescription?: string;
  defaultExpiresAt?: string; // ISO
  defaultAllowDownload?: boolean;
  defaultAllowComments?: boolean;
  defaultPassword?: string;
  defaultPreParams?: Record<string, any>;
  onCreated?: (result: { token: string; shareUrl: string; storeUrl: string }) => void;
}

export function ShareDialog(props: ShareDialogProps) {
  const [title, setTitle] = useState(props.defaultTitle || '');
  const [description, setDescription] = useState(props.defaultDescription || '');
  const [expiresAt, setExpiresAt] = useState(props.defaultExpiresAt || '');
  const [password, setPassword] = useState(props.defaultPassword || '');
  const [allowDownload, setAllowDownload] = useState(Boolean(props.defaultAllowDownload));
  const [allowComments, setAllowComments] = useState(Boolean(props.defaultAllowComments));
  const [preParams, setPreParams] = useState<string>(
    JSON.stringify(props.defaultPreParams || {}, null, 2)
  );
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      let metadata: Record<string, any> = {};
      try {
        metadata = preParams ? JSON.parse(preParams) : {};
      } catch {
        toast.error('Parámetros previos inválidos (JSON)');
        return;
      }

      const payload: any = {
        shareType: props.defaultScope,
        eventId: props.eventId,
        folderId: props.folderId,
        photoIds: props.photoIds,
        title: title || undefined,
        description: description || undefined,
        expiresAt: expiresAt || undefined,
        password: password || undefined,
        allowDownload,
        allowComments,
        metadata,
      };

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.share) {
        throw new Error(data?.error || 'No se pudo crear el enlace');
      }
      toast.success('Enlace de compartición creado');
      props.onCreated?.({ token: data.share.token, shareUrl: data.share.shareUrl, storeUrl: data.share.storeUrl });
      props.onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Error creando el enlace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compartir {props.defaultScope === 'event' ? 'evento' : props.defaultScope === 'folder' ? 'carpeta' : 'fotos'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="mb-1 block">Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="mb-1 block">Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Expira (ISO)</Label>
                <Input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="2025-12-31T23:59:59Z (opcional)" />
              </div>
              <div>
                <Label className="mb-1 block">Contraseña (opcional)</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Protege el enlace" />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Permitir descarga</Label>
              </div>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Permitir comentarios</Label>
              </div>
              <Switch checked={allowComments} onCheckedChange={setAllowComments} />
            </div>
            <div>
              <Label className="mb-1 block">Parámetros previos (JSON)</Label>
              <Textarea value={preParams} onChange={(e) => setPreParams(e.target.value)} rows={6} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={props.onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={submit} disabled={loading}>{loading ? 'Creando…' : 'Crear enlace'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;

