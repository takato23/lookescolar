'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Share2,
  Copy,
  ExternalLink,
  Zap,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  Lock,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFolderPublishData, folderPublishQueryKeys } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { useEventManagement } from '@/lib/stores/event-workflow-store';
import { useQueryClient } from '@tanstack/react-query';
import { fetchCounter } from '@/lib/services/fetch-counter';
import { extractTokenFromStoreUrl } from '@/lib/utils/store';

// --- UI Components ---

const GlassCard = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-white/40 dark:bg-black/40",
      "backdrop-blur-xl backdrop-saturate-150",
      "border border-white/20 dark:border-white/10",
      "shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
      className
    )}
    {...props}
  >
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const LiquidButton = ({ children, variant = 'default', className, ...props }: any) => {
  const variants: Record<string, string> = {
    default: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20",
    success: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20",
    danger: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-rose-500/20",
    ghost: "bg-white/10 hover:bg-white/20 text-foreground border border-white/10",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-4 py-2 rounded-xl font-medium text-sm",
        "shadow-lg transition-all duration-300",
        "flex items-center justify-center gap-2",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

const StatCard = ({ icon: Icon, label, value, subValue, colorClass }: any) => (
  <GlassCard className="p-5 flex items-start justify-between group hover:bg-white/50 dark:hover:bg-black/50 transition-colors">
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </div>
    <div className={cn("p-3 rounded-xl bg-opacity-10", colorClass)}>
      <Icon className={cn("w-5 h-5", colorClass.replace('bg-', 'text-'))} />
    </div>
  </GlassCard>
);

// --- Main Component ---

type InitialData = {
  folders: Array<{
    id: string;
    name: string;
    event_id: string | null;
    photo_count: number;
    is_published: boolean | null;
    share_token: string | null;
    published_at: string | null;
    family_url: string | null;
    qr_url: string | null;
    event_name: string | null;
    event_date: string | null;
  }>;
  event: { id: string; name: string; date?: string } | null;
  pagination?: any;
};

export default function PublishClient(props?: {
  initialSelectedEventId?: string;
  initialData?: InitialData;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('all');
  const [events, setEvents] = useState<Array<{ id: string; name: string; date?: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(props?.initialSelectedEventId || '');
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [publicStoreUrl, setPublicStoreUrl] = useState<string>('');

  // Data Hooks
  const baseData = useFolderPublishData({ enablePagination: false, enabled: !selectedEventId });

  const publishDataForEvent = useFolderPublishData({
    enablePagination: false,
    event_id: selectedEventId || undefined,
    enabled: !!selectedEventId,
    initialData: props?.initialSelectedEventId === selectedEventId ? props?.initialData : undefined,
  });

  const { initializeEvent } = useEventManagement();
  const { showPublishSuccess, showUnpublishSuccess, showRotateSuccess } = usePublishSuccessToast();

  // Derived Data
  const dataIsScoped = Boolean(selectedEventId);
  const effectiveFolders = dataIsScoped ? publishDataForEvent.folders : baseData.folders;
  const effectiveEvent = dataIsScoped ? publishDataForEvent.event : baseData.event;
  const isLoading = dataIsScoped ? publishDataForEvent.isLoading : baseData.isLoading;
  const refetch = dataIsScoped ? publishDataForEvent.refetch : baseData.refetch;

  // Mutations
  const publishMutation = dataIsScoped ? publishDataForEvent.publish : baseData.publish;
  const unpublishMutation = dataIsScoped ? publishDataForEvent.unpublish : baseData.unpublish;
  const rotateMutation = dataIsScoped ? publishDataForEvent.rotateToken : baseData.rotateToken;
  const bulkPublish = dataIsScoped ? publishDataForEvent.bulkPublish : baseData.bulkPublish;
  const bulkUnpublish = dataIsScoped ? publishDataForEvent.bulkUnpublish : baseData.bulkUnpublish;

  // Load Events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        let res = await fetch('/api/admin/events');
        if (!res.ok) res = await fetch('/api/admin/events-robust');
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.events || json.data || [];
        setEvents(list.map((e: any) => ({ id: e.id, name: e.name, date: e.date })));
      } catch (e) {
        console.error('Error loading events:', e);
      }
    };
    loadEvents();
  }, []);

  // Load Public Flag & Share URL
  useEffect(() => {
    const loadEventDetails = async () => {
      const evId = effectiveEvent?.id || selectedEventId;
      if (!evId) {
        setIsPublicEnabled(null);
        setPublicStoreUrl('');
        return;
      }

      try {
        // Public flag
        const resp = await fetch(`/api/admin/events/${evId}`);
        if (resp.ok) {
          const json = await resp.json();
          const ev = json.event || json;
          if (typeof ev?.public_gallery_enabled === 'boolean') {
            setIsPublicEnabled(ev.public_gallery_enabled);
          }
        }

        // Share URL
        const params = new URLSearchParams({ event_id: evId, active: 'true' });
        const shareRes = await fetch(`/api/admin/share/list?${params}`);
        if (shareRes.ok) {
          const data = await shareRes.json();
          const eventToken = (data.tokens || []).find((t: any) => t.share_type === 'event' && t.is_active);
          setPublicStoreUrl(eventToken?.store_url || '');
        }
      } catch (error) {
        console.error('Error loading event details:', error);
      }
    };
    loadEventDetails();
  }, [effectiveEvent?.id, selectedEventId]);

  // Filtered Folders
  const filteredFolders = useMemo(() => {
    return effectiveFolders.filter(folder => {
      const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (folder.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all'
        ? true
        : filterStatus === 'published'
          ? folder.is_published
          : !folder.is_published;
      return matchesSearch && matchesFilter;
    });
  }, [effectiveFolders, searchQuery, filterStatus]);

  // Actions
  const handlePublish = async (folderId: string) => {
    const folder = effectiveFolders.find(f => f.id === folderId);
    if (!folder) return;

    publishMutation(folderId, {
      onSuccess: (data) => {
        if (data.share_token) {
          showPublishSuccess({
            codeId: folder.id,
            codeValue: folder.name,
            token: data.share_token,
            familyUrl: data.family_url || `${window.location.origin}/s/${data.share_token}`,
            qrUrl: data.qr_url || `/access?token=${encodeURIComponent(data.share_token)}`,
            photosCount: folder.photo_count,
            eventName: effectiveEvent?.name,
            action: 'published',
          });
        }
        if (effectiveEvent?.id) initializeEvent(effectiveEvent.id).catch(() => { });
      }
    });
  };

  const handleUnpublish = async (folderId: string) => {
    const folder = effectiveFolders.find(f => f.id === folderId);
    if (!folder) return;

    unpublishMutation(folderId, {
      onSuccess: () => {
        showUnpublishSuccess(folder.name, folder.id, handlePublish);
        if (effectiveEvent?.id) initializeEvent(effectiveEvent.id).catch(() => { });
      }
    });
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish') => {
    if (selectedFolders.length === 0) return;
    setBulkOperationLoading(true);
    try {
      if (action === 'publish') {
        const publishable = selectedFolders.filter(id => {
          const f = effectiveFolders.find(x => x.id === id);
          return f && f.photo_count > 0;
        });
        if (publishable.length > 0) await bulkPublish(publishable);
      } else {
        await bulkUnpublish(selectedFolders);
      }
      setSelectedFolders([]);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const togglePublicGallery = async () => {
    const targetEventId = effectiveEvent?.id || selectedEventId;
    if (!targetEventId || isPublicEnabled === null) return;

    setTogglingPublic(true);
    try {
      const next = !isPublicEnabled;
      const resp = await fetch(`/api/admin/events/${targetEventId}/public-gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (resp.ok) {
        setIsPublicEnabled(next);
        await initializeEvent(targetEventId);
      }
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setTogglingPublic(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a small toast here if needed
  };

  // Stats
  const stats = {
    total: effectiveFolders.length,
    published: effectiveFolders.filter(f => f.is_published).length,
    photos: effectiveFolders.reduce((acc, f) => acc + f.photo_count, 0),
    empty: effectiveFolders.filter(f => f.photo_count === 0).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6 space-y-8">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Gestión de Publicaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra la visibilidad y acceso a las galerías
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-input bg-background/50 backdrop-blur-sm text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-accent/50 transition-colors w-[200px]"
            >
              <option value="">Todos los eventos</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 pointer-events-none" />
          </div>

          <LiquidButton variant="outline" onClick={() => refetch()} className="h-10 w-10 p-0">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </LiquidButton>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderOpen}
          label="Total Carpetas"
          value={stats.total}
          colorClass="bg-blue-500 text-blue-600"
        />
        <StatCard
          icon={Globe}
          label="Publicadas"
          value={stats.published}
          subValue={`${Math.round((stats.published / (stats.total || 1)) * 100)}% del total`}
          colorClass="bg-emerald-500 text-emerald-600"
        />
        <StatCard
          icon={ImageIcon}
          label="Total Fotos"
          value={stats.photos.toLocaleString()}
          colorClass="bg-indigo-500 text-indigo-600"
        />
        {effectiveEvent && (
          <GlassCard className="p-5 flex flex-col justify-between group hover:bg-white/50 dark:hover:bg-black/50 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Galería Pública</p>
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-2 w-2 rounded-full", isPublicEnabled ? "bg-emerald-500" : "bg-gray-300")} />
                  <span className="font-medium">{isPublicEnabled ? 'Activa' : 'Inactiva'}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={togglePublicGallery}
                disabled={togglingPublic}
              >
                <Zap className={cn("w-4 h-4", isPublicEnabled ? "text-emerald-500" : "text-gray-400")} />
              </Button>
            </div>
            {publicStoreUrl && (
              <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                <Button variant="outline" size="xs" className="flex-1 h-7 text-xs" onClick={() => window.open(publicStoreUrl, '_blank')}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver
                </Button>
                <Button variant="outline" size="xs" className="h-7 w-7 p-0" onClick={() => copyToClipboard(publicStoreUrl)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Main Content Area */}
      <GlassCard className="flex flex-col min-h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/20 dark:bg-black/20">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar carpetas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-transparent focus:bg-background transition-all"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('published')}>
                  Publicados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('unpublished')}>
                  No publicados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedFolders.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {selectedFolders.length} seleccionados
              </span>
              <LiquidButton
                variant="success"
                size="sm"
                onClick={() => handleBulkAction('publish')}
                disabled={bulkOperationLoading}
              >
                <Sparkles className="w-4 h-4" /> Publicar
              </LiquidButton>
              <LiquidButton
                variant="danger"
                size="sm"
                onClick={() => handleBulkAction('unpublish')}
                disabled={bulkOperationLoading}
              >
                <EyeOff className="w-4 h-4" /> Ocultar
              </LiquidButton>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isSelected={selectedFolders.includes(folder.id)}
                onSelect={() => {
                  setSelectedFolders(prev =>
                    prev.includes(folder.id)
                      ? prev.filter(id => id !== folder.id)
                      : [...prev, folder.id]
                  );
                }}
                onPublish={() => handlePublish(folder.id)}
                onUnpublish={() => handleUnpublish(folder.id)}
                onCopyLink={() => folder.family_url && copyToClipboard(folder.family_url)}
              />
            ))}
          </AnimatePresence>

          {filteredFolders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>No se encontraron carpetas</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// --- Sub-components ---

function FolderCard({ folder, isSelected, onSelect, onPublish, onUnpublish, onCopyLink }: any) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative rounded-xl border transition-all duration-300 overflow-hidden",
        "bg-white/60 dark:bg-gray-900/60 backdrop-blur-md",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10"
          : "border-border/50 hover:border-border hover:shadow-lg"
      )}
      onClick={onSelect}
    >
      {/* Status Stripe */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        folder.is_published ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-800"
      )} />

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className={cn(
            "p-2.5 rounded-lg transition-colors",
            folder.is_published
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          )}>
            {folder.is_published ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {folder.is_published && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyLink}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(folder.family_url, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {folder.is_published ? (
                  <DropdownMenuItem onClick={onUnpublish} className="text-red-600">
                    <EyeOff className="w-4 h-4 mr-2" /> Despublicar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onPublish} className="text-emerald-600">
                    <Sparkles className="w-4 h-4 mr-2" /> Publicar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h3 className="font-semibold text-foreground truncate mb-1" title={folder.name}>
          {folder.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <ImageIcon className="w-3 h-3" />
          <span>{folder.photo_count} fotos</span>
          {folder.event_name && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="truncate max-w-[100px]">{folder.event_name}</span>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
          {folder.is_published ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20"
              onClick={onUnpublish}
            >
              Despublicar
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onPublish}
            >
              Publicar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
