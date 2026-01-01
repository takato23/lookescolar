'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ShareScopeConfig } from '@/lib/services/share.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  usePhotoSelectionStore,
  selectionSelectors,
  selectionShallow,
} from '@/store/usePhotoSelectionStore';
import { SelectionScopePanel } from './SelectionScopePanel';

interface FolderOption {
  id: string;
  name: string;
}

interface FamilyOption {
  id: string;
  alias: string;
  email?: string | null;
}

interface ShareWizardProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface ShareSummary {
  id: string;
  token: string;
  shareUrl: string;
  storeUrl: string;
  audiencesCount: number;
  scopeConfig: ShareScopeConfig;
}

const TEMPLATE_OPTIONS = [
  { id: 'default', label: 'Notificación estándar' },
  { id: 'reminder', label: 'Recordatorio final' },
  { id: 'custom', label: 'Plantilla personalizada' },
];

const STEPS = ['Alcance', 'Audiencias', 'Ajustes y envío'];

export function ShareWizard({ eventId, isOpen, onClose, onCompleted }: ShareWizardProps) {
  const [step, setStep] = useState(0);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [scope, setScope] = useState<'event' | 'folder' | 'selection'>('event');
  const [includeDescendants, setIncludeDescendants] = useState(false);

  const [allowDownload, setAllowDownload] = useState(true);
  const [allowComments, setAllowComments] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(30);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [familyOptions, setFamilyOptions] = useState<FamilyOption[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set());

  const [groupInput, setGroupInput] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const [manualEmailInput, setManualEmailInput] = useState('');
  const [manualEmails, setManualEmails] = useState<string[]>([]);

  const [templateId, setTemplateId] = useState<string>('default');
  const [customTemplate, setCustomTemplate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareSummary | null>(null);

  const selectionItemsSelector = useMemo(() => selectionSelectors.sortedByEvent(eventId), [eventId]);
  const selectionItems = usePhotoSelectionStore(selectionItemsSelector, selectionShallow);
  const selectionIdsSelector = useMemo(() => selectionSelectors.idsByEvent(eventId), [eventId]);
  const selectedPhotoIds = usePhotoSelectionStore(selectionIdsSelector, selectionShallow);
  const selectionCount = selectedPhotoIds.length;

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const loadFolders = async () => {
      setLoadingFolders(true);
      try {
        const params = new URLSearchParams({
          include_unpublished: 'true',
          limit: '200',
          order_by: 'name_asc',
          event_id: eventId,
        });
        const res = await fetch(`/api/admin/folders/published?${params.toString()}`);
        if (!res.ok) throw new Error('No se pudieron cargar las carpetas');
        const data = await res.json();
        if (mounted) {
          const options = (data.folders || []).map((folder: any) => ({
            id: folder.id,
            name: folder.name,
          }));
          setFolderOptions(options);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al cargar carpetas');
      } finally {
        if (mounted) setLoadingFolders(false);
      }
    };

    const loadFamilies = async () => {
      setLoadingFamilies(true);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/aliases`);
        if (!res.ok) throw new Error('No se pudieron cargar los contactos');
        const data = await res.json();
        if (mounted) {
          const options = (data.tokens || []).map((token: any) => ({
            id: token.id || token.alias,
            alias: token.alias || 'Cliente',
            email: token.family_email,
          }));
          setFamilyOptions(options);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al cargar contactos');
      } finally {
        if (mounted) setLoadingFamilies(false);
      }
    };

    loadFolders();
    loadFamilies();

    return () => {
      mounted = false;
    };
  }, [eventId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scope === 'selection' && includeDescendants) {
      setIncludeDescendants(false);
    }
  }, [scope, includeDescendants]);

  const scopeSummary = useMemo(() => {
    if (scope === 'event') {
      return 'Todo el evento';
    }
    if (scope === 'folder') {
      const folder = folderOptions.find((f) => f.id === selectedFolderId);
      return folder ? `Carpeta: ${folder.name}` : 'Seleccionar carpeta';
    }
    if (selectionCount === 0) {
      return 'Seleccioná fotos para continuar';
    }
    return `${selectionCount} foto(s) seleccionada(s)`;
  }, [scope, folderOptions, selectedFolderId, selectionCount]);

  const audienceSummary = useMemo(() => {
    const families = selectedFamilies.size;
    const groups = groupIds.length;
    const emails = manualEmails.length;
    return { families, groups, emails };
  }, [selectedFamilies, groupIds, manualEmails]);

  const canProceedScope = useMemo(() => {
    if (scope === 'event') return true;
    if (scope === 'folder') return Boolean(selectedFolderId);
    return selectionCount > 0;
  }, [scope, selectedFolderId, selectionCount]);

  const canProceedAudiences = useMemo(() => {
    return (
      selectedFamilies.size > 0 || groupIds.length > 0 || manualEmails.length > 0
    );
  }, [selectedFamilies, groupIds, manualEmails]);

  const summaryScopeConfig = useMemo<ShareScopeConfig>(() => {
    if (scope === 'folder') {
      return {
        scope: 'folder',
        anchorId: selectedFolderId || '',
        includeDescendants,
        filters: {},
      };
    }
    if (scope === 'selection') {
      return {
        scope: 'selection',
        anchorId: eventId,
        includeDescendants: false,
        filters: { photoIds: selectedPhotoIds },
      };
    }
    return {
      scope: 'event',
      anchorId: eventId,
      includeDescendants,
      filters: {},
    };
  }, [scope, selectedFolderId, includeDescendants, eventId, selectedPhotoIds]);

  function resetState() {
    setStep(0);
    setScope('event');
    setIncludeDescendants(false);
    setSelectedFolderId(null);
    setAllowDownload(true);
    setAllowComments(false);
    setExpiresInDays(30);
    setTitle('');
    setDescription('');
    setSelectedFamilies(new Set());
    setGroupInput('');
    setGroupIds([]);
    setManualEmailInput('');
    setManualEmails([]);
    setTemplateId('default');
    setCustomTemplate('');
    setIsSubmitting(false);
    setCreatedShare(null);
  }

  function parseDelimitedList(value: string): string[] {
    return value
      .split(/\s|,|;|\n/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function handleToggleFamily(id: string) {
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAddGroupId() {
    const ids = parseDelimitedList(groupInput);
    if (!ids.length) return;
    setGroupIds((prev) => Array.from(new Set([...prev, ...ids])));
    setGroupInput('');
  }

  function handleAddManualEmail() {
    const email = manualEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Correo inválido');
      return;
    }
    setManualEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
    setManualEmailInput('');
  }

  function handleRemoveManualEmail(email: string) {
    setManualEmails((prev) => prev.filter((item) => item !== email));
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const body = {
        scopeConfig: summaryScopeConfig,
        shareType:
          scope === 'selection'
            ? 'photos'
            : scope === 'folder'
            ? 'folder'
            : 'event',
        eventId,
        folderId: selectedFolderId,
        photoIds: scope === 'selection' ? selectedPhotoIds : undefined,
        includeDescendants,
        allowDownload,
        allowComments,
        title: title || undefined,
        description: description || undefined,
        expiresAt:
          typeof expiresInDays === 'number' && expiresInDays > 0
            ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
            : undefined,
        audiences: [
          ...Array.from(selectedFamilies).map((subjectId) => ({
            type: 'family',
            subjectId,
          })),
          ...groupIds.map((subjectId) => ({ type: 'group', subjectId })),
          ...manualEmails.map((contactEmail) => ({ type: 'manual', contactEmail })),
        ],
        metadata: {
          deliveryTemplate: templateId === 'custom' ? customTemplate || 'custom' : templateId,
        },
      };

      const createRes = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errorPayload = await createRes.json().catch(() => ({}));
        throw new Error(errorPayload?.error || 'No se pudo crear el enlace');
      }

      const sharePayload = await createRes.json();
      const share = sharePayload.share as {
        id: string;
        token: string;
        shareUrl: string;
        storeUrl: string;
        audiencesCount: number;
        scopeConfig: ShareScopeConfig;
      };

      const deliverRes = await fetch('/api/share/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareTokenId: share.id,
          audience: {
            families: Array.from(selectedFamilies),
            groups: groupIds,
            emails: manualEmails,
          },
          templateId: templateId === 'custom' ? customTemplate || 'custom' : templateId,
        }),
      });

      if (!deliverRes.ok) {
        const payload = await deliverRes.json().catch(() => ({}));
        throw new Error(payload?.error || 'No se pudo programar la entrega');
      }

      const deliverPayload = await deliverRes.json();

      setCreatedShare({
        id: share.id,
        token: share.token,
        shareUrl: share.shareUrl,
        storeUrl: share.storeUrl,
        audiencesCount: deliverPayload.audiencesCount ?? share.audiencesCount ?? 0,
        scopeConfig: share.scopeConfig,
      });

      toast.success('Compartición creada y entrega programada');
      onCompleted?.();
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear el share');
    } finally {
      setIsSubmitting(false);
    }
  }

  const StepControls = (
    <div className="flex items-center justify-between pt-6">
      <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <div className="flex items-center gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((prev) => prev - 1)} disabled={isSubmitting}>
            Atrás
          </Button>
        )}
        {step < 2 && (
          <Button
            onClick={() => setStep((prev) => prev + 1)}
            disabled={(step === 0 && !canProceedScope) || (step === 1 && !canProceedAudiences)}
          >
            Siguiente
          </Button>
        )}
        {step === 2 && (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear y programar'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog key={eventId} open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nuevo sistema de compartición</DialogTitle>
          <DialogDescription>
            Configurá qué parte del evento vas a compartir, elegí las audiencias y definí los ajustes de entrega antes de enviar las invitaciones.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {STEPS.map((label, index) => (
              <React.Fragment key={label}>
                <div
                  className={cn(
                    'flex items-center gap-2',
                    index === step ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <span className={cn('h-6 w-6 rounded-full border flex items-center justify-center', index === step && 'border-primary text-primary')}>
                    {index + 1}
                  </span>
                  {label}
                </div>
                {index < STEPS.length - 1 && <span className="text-xs">→</span>}
              </React.Fragment>
            ))}
          </div>

          {step === 0 && (
            <section className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Definir alcance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: 'event', label: 'Evento completo', description: 'Todas las fotos del evento' },
                    { key: 'folder', label: 'Carpeta específica', description: 'Un álbum o nivel particular' },
                    { key: 'selection', label: 'Selección manual', description: 'IDs de fotos específicos' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setScope(option.key as typeof scope)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition hover:border-primary/60',
                        scope === option.key ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {scope === 'folder' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar carpeta</label>
                  <Select
                    value={selectedFolderId || ''}
                    onValueChange={(value) => setSelectedFolderId(value || null)}
                    disabled={loadingFolders || folderOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFolders ? 'Cargando...' : 'Elegir carpeta'} />
                    </SelectTrigger>
                    <SelectContent>
                      {folderOptions.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {folderOptions.length === 0 && !loadingFolders && (
                    <p className="text-sm text-muted-foreground">
                      No encontramos carpetas publicadas para este evento.
                    </p>
                  )}
                </div>
              )}

              {scope === 'selection' && (
                <SelectionScopePanel eventId={eventId} folders={folderOptions} />
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Incluir subcarpetas</div>
                  <p className="text-sm text-muted-foreground">
                    Extiende el alcance a carpetas hijas cuando corresponda.
                  </p>
                </div>
                <Switch
                  checked={includeDescendants}
                  onCheckedChange={setIncludeDescendants}
                  disabled={scope === 'selection'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium">Permitir descargas</div>
                    <p className="text-sm text-muted-foreground">Los usuarios podrán descargar contenidos.</p>
                  </div>
                  <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium">Permitir comentarios</div>
                    <p className="text-sm text-muted-foreground">Habilita feedback dentro de la galería.</p>
                  </div>
                  <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título interno</label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Información adicional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Expira en (días)</label>
                <Input
                  type="number"
                  value={expiresInDays}
                  onChange={(event) => {
                    const value = event.target.value;
                    setExpiresInDays(value === '' ? '' : Number(value));
                  }}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Usa 0 para dejar sin expiración.
                </p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Clientes</h3>
                <p className="text-sm text-muted-foreground">
                  Selecciona los clientes o invitados que recibirán el enlace. Puedes filtrar por alias o correo.
                </p>
                <div className="max-h-72 overflow-y-auto rounded-lg border">
                  {loadingFamilies ? (
                    <div className="p-4 text-sm text-muted-foreground">Cargando contactos...</div>
                  ) : familyOptions.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No hay contactos registrados.</div>
                  ) : (
                    <ul className="divide-y">
                      {familyOptions.map((family) => {
                        const checked = selectedFamilies.has(family.id);
                        return (
                          <li key={family.id} className="flex items-center gap-3 p-3">
                            <Checkbox checked={checked} onCheckedChange={() => handleToggleFamily(family.id)} />
                            <div className="flex flex-col">
                              <span className="font-medium">{family.alias}</span>
                              {family.email && (
                                <span className="text-xs text-muted-foreground">{family.email}</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Grupos</h3>
                  <p className="text-sm text-muted-foreground">
                    Ingresa IDs de grupos o cursos. Se separan por coma o salto de línea.
                  </p>
                  <Textarea
                    value={groupInput}
                    onChange={(event) => setGroupInput(event.target.value)}
                    rows={3}
                    placeholder="UUIDs o identificadores"
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={handleAddGroupId}>
                      Agregar grupos
                    </Button>
                    {groupIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">{groupIds.length} grupo(s) seleccionado(s)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Correos manuales</h3>
                  <p className="text-sm text-muted-foreground">
                    Añade correos adicionales para invitados especiales o contactos externos.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={manualEmailInput}
                      onChange={(event) => setManualEmailInput(event.target.value)}
                      placeholder="correo@ejemplo.com"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddManualEmail();
                        }
                      }}
                    />
                    <Button variant="outline" onClick={handleAddManualEmail}>
                      Agregar
                    </Button>
                  </div>
                  {manualEmails.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {manualEmails.map((email) => (
                        <li key={email} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                          {email}
                          <button type="button" onClick={() => handleRemoveManualEmail(email)} className="text-xs text-muted-foreground hover:text-foreground">
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border p-4 text-sm">
                  <div className="font-medium">Resumen parcial</div>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>Clientes seleccionados: {selectedFamilies.size}</li>
                    <li>{groupIds.length} grupo(s)</li>
                    <li>{manualEmails.length} correo(s) manual(es)</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="font-semibold">Resumen de alcance</h3>
                <p className="text-sm text-muted-foreground">{scopeSummary}</p>
                <p className="text-xs text-muted-foreground">
                  Descendientes: {includeDescendants ? 'Sí' : 'No'} · Descargas: {allowDownload ? 'Sí' : 'No'} · Comentarios:{' '}
                  {allowComments ? 'Sí' : 'No'}
                </p>
                {scope === 'selection' && selectionItems.length > 0 && (
                  <div className="mt-3 rounded-md border bg-muted/40 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {selectionItems.length} foto(s) incluidas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectionItems.slice(0, 6).map((item) => (
                        <div key={item.id} className="relative h-14 w-14 overflow-hidden rounded border">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.filename || item.id}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                              {(item.filename || item.id).slice(0, 6)}
                            </div>
                          )}
                        </div>
                      ))}
                      {selectionItems.length > 6 && (
                        <div className="flex h-14 w-14 items-center justify-center rounded border text-[11px] text-muted-foreground">
                          +{selectionItems.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="font-semibold">Audiencias</h3>
                <p className="text-sm text-muted-foreground">
                  {audienceSummary.families} clientes · {audienceSummary.groups} grupos · {audienceSummary.emails} correos manuales
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plantilla de entrega</label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {templateId === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Identificador de plantilla</label>
                    <Input
                      value={customTemplate}
                      onChange={(event) => setCustomTemplate(event.target.value)}
                      placeholder="Ej: promo-octubre"
                    />
                  </div>
                )}
              </div>

              {typeof expiresInDays === 'number' && expiresInDays > 0 && (
                <div className="rounded-lg border p-4 text-sm">
                  Este enlace expirará el{' '}
                  {new Date(Date.now() + expiresInDays * 86_400_000).toLocaleDateString()}
                </div>
              )}

              {createdShare && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">Enlace generado</h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{createdShare.shareUrl}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(createdShare.shareUrl)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{createdShare.storeUrl}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(createdShare.storeUrl)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Audiencias registradas: {createdShare.audiencesCount}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {StepControls}
        </div>
      </DialogContent>
    </Dialog>
  );
}
