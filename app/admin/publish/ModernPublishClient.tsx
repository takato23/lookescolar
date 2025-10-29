'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFolderPublishData } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  BarChart3,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Share2,
  Calendar,
  Image,
  FolderOpen,
} from 'lucide-react';

// Modern glass card component
const GlassCard = ({ children, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-surface/80 dark:bg-surface/90",
      "backdrop-blur-xl backdrop-saturate-150",
      "border border-border/20 dark:border-border/30",
      "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
      "before:absolute before:inset-0 before:rounded-2xl",
      "before:bg-gradient-to-br before:from-white/10 before:to-transparent",
      "dark:before:from-white/5 dark:before:to-transparent",
      "hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)]",
      "transition-all duration-300",
      className
    )}
    {...props}
  >
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// Liquid button component
const LiquidButton = ({ children, variant = 'default', className, ...props }: any) => {
  const variants = {
    default: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-foreground",
    success: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-foreground",
    danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-foreground",
    ghost: "bg-surface/10 hover:bg-surface/20 backdrop-blur-sm",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-6 py-3 rounded-xl font-medium",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300",
        "overflow-hidden",
        variants[variant],
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <motion.div
        className="absolute inset-0 -z-0"
        initial={{ x: '-100%' }}
        whileHover={{ x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }}
      />
    </motion.button>
  );
};

// Stats card component
const StatsCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <GlassCard className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground0 dark:text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className={cn(
            "mt-2 text-sm font-medium",
            trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </div>
      <div className={cn(
        "p-3 rounded-xl",
        `bg-gradient-to-br ${color}`
      )}>
        <Icon className="w-6 h-6 text-foreground" />
      </div>
    </div>
  </GlassCard>
);

// Folder card with modern design
const ModernFolderCard = ({ folder, onPublish, onUnpublish, onSelect, isSelected }: any) => {
  const isPublished = folder.is_published;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      <GlassCard 
        className={cn(
          "p-6 cursor-pointer",
          isSelected && "ring-2 ring-blue-500 ring-offset-2"
        )}
        onClick={() => onSelect(folder.id)}
      >
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge className={cn(
            "px-3 py-1.5 rounded-full font-medium",
            isPublished 
              ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
              : "bg-muted0/20 text-foreground dark:text-muted-foreground border-border0/30"
          )}>
            {isPublished ? (
              <>
                <Globe className="w-3 h-3 mr-1" />
                Publicado
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" />
                Privado
              </>
            )}
          </Badge>
        </div>

        {/* Folder Icon and Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              {folder.name}
            </h3>
            <p className="text-sm text-muted-foreground0 dark:text-muted-foreground mt-1">
              {folder.event_name || 'Sin evento'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-muted-foreground0 dark:text-muted-foreground" />
            <span className="text-sm text-muted-foreground0 dark:text-muted-foreground">
              {folder.photo_count || 0} fotos
            </span>
          </div>
          {folder.published_at && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground0 dark:text-muted-foreground" />
              <span className="text-sm text-muted-foreground0 dark:text-muted-foreground">
                {new Date(folder.published_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isPublished ? (
            <>
              <LiquidButton
                variant="ghost"
                className="flex-1 py-2 text-sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  window.open(folder.family_url, '_blank');
                }}
              >
                <Eye className="w-4 h-4" />
                Ver
              </LiquidButton>
              <LiquidButton
                variant="ghost"
                className="flex-1 py-2 text-sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(folder.family_url);
                }}
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </LiquidButton>
              <LiquidButton
                variant="danger"
                className="py-2 px-3 text-sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onUnpublish(folder.id);
                }}
              >
                <EyeOff className="w-4 h-4" />
              </LiquidButton>
            </>
          ) : (
            <LiquidButton
              variant="success"
              className="flex-1 py-2 text-sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onPublish(folder.id);
              }}
            >
              <Sparkles className="w-4 h-4" />
              Publicar
            </LiquidButton>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default function ModernPublishClient(props?: any) {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('folders');

  // Data hooks
  const data = useFolderPublishData({ 
    enablePagination: false, 
    enabled: true,
    initialData: props?.initialData,
  });
  const { folders = [], isLoading } = data;

  // Toast notifications
  const { showPublishSuccess, showUnpublishSuccess } = usePublishSuccessToast();

  // Publish/Unpublish handlers
  const handlePublish = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    try {
      const response = await fetch('/api/admin/folders/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });
      
      if (response.ok) {
        showPublishSuccess({
          codeId: folder.id,
          codeValue: folder.name,
          token: folder.share_token || '',
          familyUrl: folder.family_url || '',
          qrUrl: folder.qr_url || '',
          photosCount: folder.photo_count || 0,
          action: 'published'
        });
        data.refetch();
      }
    } catch (error) {
      console.error('Error publishing folder:', error);
    }
  };

  const handleUnpublish = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    try {
      const response = await fetch('/api/admin/folders/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });
      
      if (response.ok) {
        showUnpublishSuccess(folder.name, folder.id);
        data.refetch();
      }
    } catch (error) {
      console.error('Error unpublishing folder:', error);
    }
  };

  // Calculate stats
  const publishedCount = folders.filter(f => f.is_published).length;
  const totalPhotos = folders.reduce((acc, f) => acc + (f.photo_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 dark:from-background dark:via-background/95 dark:to-background/90">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestión de Publicaciones
              </h1>
              <p className="mt-2 text-muted-foreground0 dark:text-muted-foreground">
                Administra y publica las galerías de fotos para las familias
              </p>
            </div>
            <LiquidButton onClick={() => data.refetch()}>
              <RefreshCw className="w-5 h-5" />
              Actualizar
            </LiquidButton>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={FolderOpen}
            label="Total de Carpetas"
            value={folders.length}
            color="from-blue-500 to-blue-600"
          />
          <StatsCard
            icon={Globe}
            label="Carpetas Publicadas"
            value={publishedCount}
            trend={publishedCount > 0 ? ((publishedCount / folders.length) * 100).toFixed(0) : 0}
            color="from-green-500 to-emerald-600"
          />
          <StatsCard
            icon={Image}
            label="Total de Fotos"
            value={totalPhotos}
            color="from-purple-500 to-pink-600"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 p-1 bg-surface/80 dark:bg-surface/90 backdrop-blur-xl rounded-xl">
            <TabsTrigger value="folders" className="rounded-lg">
              <FolderOpen className="w-4 h-4 mr-2" />
              Carpetas
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analíticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="folders" className="space-y-6">
            {/* Filter Bar */}
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={selectedFolders.length === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFolders([])}
                  >
                    Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const published = folders.filter(f => f.is_published).map(f => f.id);
                      setSelectedFolders(published);
                    }}
                  >
                    Publicadas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unpublished = folders.filter(f => !f.is_published).map(f => f.id);
                      setSelectedFolders(unpublished);
                    }}
                  >
                    No Publicadas
                  </Button>
                </div>
                {selectedFolders.length > 0 && (
                  <div className="flex gap-2">
                    <LiquidButton variant="success">
                      <Sparkles className="w-4 h-4" />
                      Publicar Seleccionadas ({selectedFolders.length})
                    </LiquidButton>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Folders Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <GlassCard key={i} className="h-48 animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {folders.map((folder) => (
                    <ModernFolderCard
                      key={folder.id}
                      folder={folder}
                      onPublish={handlePublish}
                      onUnpublish={handleUnpublish}
                      onSelect={(id: string) => {
                        setSelectedFolders(prev =>
                          prev.includes(id)
                            ? prev.filter(f => f !== id)
                            : [...prev, id]
                        );
                      }}
                      isSelected={selectedFolders.includes(folder.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <GlassCard className="p-8">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground0 dark:text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Próximamente</h3>
                <p className="text-muted-foreground0 dark:text-muted-foreground">
                  Las analíticas detalladas estarán disponibles pronto
                </p>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}