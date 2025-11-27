'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronDown,
  Image as ImageIcon,
  Pencil,
  Settings,
  Activity,
  Plus,
  MoreHorizontal,
  Eye,
  Share2,
  GripVertical,
  Lock,
  Download,
  Heart,
  ShoppingCart,
  X,
  Copy,
  Check,
  Mail,
  Link2,
  QrCode,
  Users,
  Calendar,
  Globe,
  Smartphone,
  Star,
  Palette,
  Type,
  Grid3X3,
  AlertCircle,
  ExternalLink,
  Play,
  Sparkles,
  FolderOpen,
  Tag,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

// Types from database
type EventRow = Database['public']['Tables']['events']['Row'];

// Internal types for the component
interface EventFolder {
  id: string;
  name: string;
  photoCount: number;
}

interface EventStats {
  photos: number;
  subjects: number;
  orders: number;
  revenue: number;
}

// Tabs for the sidebar
type SidebarTab = 'photos' | 'design' | 'settings' | 'activity';

// Settings sub-sections
type SettingsSection = 'general' | 'privacy' | 'download' | 'favorite' | 'store';

// Design sub-sections
type DesignSection = 'cover' | 'theme' | 'layout' | 'app';

// Cover style options
type CoverStyle = 'full' | 'third' | 'none';

// Theme options
type ThemeName = 'echo' | 'spring' | 'lark' | 'sage';

// Props from the API
interface CleanEventDetailPageProps {
  event: EventRow;
  stats: EventStats;
  currency: string;
}

// Helper function to format date
function formatEventDate(event: EventRow): string {
  const dateStr = event.date;
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Helper to determine status
function getEventStatus(event: EventRow): 'draft' | 'published' {
  const rawStatus = (event.status ?? '').toString().toLowerCase();
  const isLive =
    rawStatus === 'active' ||
    rawStatus === 'published' ||
    rawStatus === 'live';
  return isLive ? 'published' : 'draft';
}

// Parse settings from event metadata field
function parseEventSettings(event: EventRow): {
  url?: string;
  password?: string;
  downloadEnabled?: boolean;
  favoriteEnabled?: boolean;
  storeEnabled?: boolean;
} {
  const metadata = event.metadata as Record<string, unknown> | null;
  if (!metadata) return {};
  return {
    url: typeof metadata.url === 'string' ? metadata.url : undefined,
    password: typeof metadata.password === 'string' ? metadata.password : undefined,
    downloadEnabled: Boolean(metadata.downloadEnabled ?? metadata.download_enabled),
    favoriteEnabled: Boolean(metadata.favoriteEnabled ?? metadata.favorite_enabled),
    storeEnabled: Boolean(metadata.storeEnabled ?? metadata.store_enabled),
  };
}

export default function CleanEventDetailPage({ event, stats }: CleanEventDetailPageProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('photos');
  const [showShareModal, setShowShareModal] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general');
  const [designSection, setDesignSection] = useState<DesignSection>('cover');
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Folders state - fetch from API
  const [folders, setFolders] = useState<EventFolder[]>([
    { id: 'all', name: 'All Photos', photoCount: stats.photos },
  ]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersVersion, setFoldersVersion] = useState(0);

  // Fetch folders from API
  const fetchFolders = async () => {
    setFoldersLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}/folders`);
      if (response.ok) {
        const data = await response.json();
        const apiFolders: EventFolder[] = (data.folders || []).map((f: { id: string; name: string; photo_count?: number }) => ({
          id: f.id,
          name: f.name,
          photoCount: f.photo_count || 0,
        }));

        // Always include "All Photos" as the first folder
        setFolders([
          { id: 'all', name: 'All Photos', photoCount: stats.photos },
          ...apiFolders,
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  };

  // Fetch folders on mount and when version changes
  useEffect(() => {
    fetchFolders();
  }, [event.id, foldersVersion]);

  const handleFoldersChange = () => {
    setFoldersVersion(v => v + 1);
  };

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('all');

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];
  const eventDate = formatEventDate(event);
  const eventStatus = getEventStatus(event);
  const eventSettings = parseEventSettings(event);

  return (
    <div className="clean-event-detail">
      {/* Top Header Bar */}
      <header className="clean-event-header">
        <div className="clean-event-header-left">
          <Link href="/admin/events" className="clean-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="clean-event-title-group">
            <h1 className="clean-event-title">{event.name ?? 'Evento sin título'}</h1>
            <span className="clean-event-date">{eventDate}</span>
          </div>
          <StatusDropdown status={eventStatus} />
        </div>

        <div className="clean-event-header-right">
          <button className="clean-header-action">
            More <ChevronDown className="w-4 h-4" />
          </button>
          <PreviewDropdown
            eventId={event.id}
            onMobilePreview={() => setShowMobilePreview(true)}
          />
          <button
            onClick={() => setShowShareModal(true)}
            className="clean-header-action clean-header-action--primary"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </header>

      <div className="clean-event-layout">
        {/* Left Sidebar */}
        <aside className="clean-event-sidebar">
          {/* Cover Preview */}
          <div className="clean-event-preview">
            <div className="clean-event-preview-empty">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
          </div>

          {/* Tabs */}
          <div className="clean-event-tabs">
            <TabButton
              icon={<ImageIcon className="w-4 h-4" />}
              active={activeTab === 'photos'}
              onClick={() => setActiveTab('photos')}
            />
            <TabButton
              icon={<Pencil className="w-4 h-4" />}
              active={activeTab === 'design'}
              onClick={() => setActiveTab('design')}
            />
            <TabButton
              icon={<Settings className="w-4 h-4" />}
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            <TabButton
              icon={<Activity className="w-4 h-4" />}
              active={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
            />
          </div>

          {/* Tab Content */}
          <div className="clean-event-sidebar-content">
            {activeTab === 'photos' && (
              <PhotosTabContent
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                eventId={event.id}
                onFoldersChange={handleFoldersChange}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTabContent
                settings={eventSettings}
                activeSection={settingsSection}
                onSectionChange={setSettingsSection}
              />
            )}
            {activeTab === 'design' && (
              <DesignTabContent
                activeSection={designSection}
                onSectionChange={setDesignSection}
              />
            )}
            {activeTab === 'activity' && <ActivityTabContent />}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="clean-event-main">
          {activeTab === 'photos' && selectedFolder && (
            <PhotosView folder={selectedFolder} eventId={event.id} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              eventId={event.id}
              settings={eventSettings}
              activeSection={settingsSection}
            />
          )}
          {activeTab === 'design' && (
            <DesignView
              event={event}
              activeSection={designSection}
              showMobilePreview={showMobilePreview}
              onToggleMobilePreview={() => setShowMobilePreview(!showMobilePreview)}
            />
          )}
          {activeTab === 'activity' && <ActivityView />}
        </main>

        {/* Mobile Preview Panel */}
        {showMobilePreview && (
          <MobilePreviewPanel event={event} onClose={() => setShowMobilePreview(false)} />
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          event={event}
          eventDate={eventDate}
          settings={eventSettings}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// Status Dropdown
function StatusDropdown({ status }: { status: 'draft' | 'published' }) {
  const config = {
    draft: { label: 'DRAFT', class: 'clean-status-badge--draft' },
    published: { label: 'PUBLISHED', class: 'clean-status-badge--published' },
  };

  const { label, class: statusClass } = config[status];

  return (
    <button className={cn('clean-status-badge', statusClass)}>
      {label} <ChevronDown className="w-3 h-3 ml-1" />
    </button>
  );
}

// Preview Dropdown
function PreviewDropdown({
  eventId,
  onMobilePreview,
}: {
  eventId: string;
  onMobilePreview: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="clean-preview-dropdown">
      <button
        className="clean-header-action"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Eye className="w-4 h-4" />
        Preview
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="clean-dropdown-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="clean-dropdown-menu clean-preview-menu">
            <Link
              href={`/gallery/${eventId}`}
              target="_blank"
              className="clean-dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <Globe className="w-4 h-4" />
              <span>Web Preview</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Link>
            <button
              className="clean-dropdown-item"
              onClick={() => {
                onMobilePreview();
                setIsOpen(false);
              }}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile Preview</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Tab Button
function TabButton({
  icon,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('clean-event-tab', active && 'clean-event-tab--active')}
    >
      {icon}
    </button>
  );
}

// Photos Tab Content (Sidebar) - with full folder management
function PhotosTabContent({
  folders,
  selectedFolderId,
  onSelectFolder,
  eventId,
  onFoldersChange,
}: {
  folders: EventFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  eventId: string;
  onFoldersChange: () => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<EventFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<EventFolder | null>(null);
  const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Handle folder drag start
  const handleDragStart = (e: React.DragEvent, folderId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFolderId(folderId);
  };

  // Handle folder drag over
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedFolderId && draggedFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  // Handle folder drop - reorder
  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    if (!draggedFolderId || draggedFolderId === targetFolderId) {
      setDraggedFolderId(null);
      setDragOverFolderId(null);
      return;
    }

    // Calculate new sort order based on target position
    const draggedIndex = folders.findIndex(f => f.id === draggedFolderId);
    const targetIndex = folders.findIndex(f => f.id === targetFolderId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Get the sort order for the dragged folder based on its new position
    const newSortOrder = targetIndex;

    try {
      await fetch(`/api/admin/folders/${draggedFolderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newSortOrder }),
      });
      onFoldersChange();
    } catch (error) {
      console.error('Failed to reorder folder:', error);
    }

    setDraggedFolderId(null);
    setDragOverFolderId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveFolderMenu(null);
    if (activeFolderMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeFolderMenu]);

  return (
    <div className="clean-folders-section">
      <div className="clean-folders-header">
        <span className="clean-folders-label">PHOTOS</span>
        <button
          className="clean-add-set-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Set
        </button>
      </div>

      <div className="clean-folders-list">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              'clean-folder-item',
              selectedFolderId === folder.id && 'clean-folder-item--active',
              dragOverFolderId === folder.id && 'clean-folder-item--drag-over',
              draggedFolderId === folder.id && 'clean-folder-item--dragging'
            )}
            onClick={() => onSelectFolder(folder.id)}
            draggable={folder.id !== 'all' && folder.id !== 'tagged'}
            onDragStart={(e) => handleDragStart(e, folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDrop(e, folder.id)}
            onDragEnd={() => { setDraggedFolderId(null); setDragOverFolderId(null); }}
          >
            {folder.id !== 'all' && folder.id !== 'tagged' && (
              <GripVertical className="clean-folder-grip" />
            )}
            <span className="clean-folder-name">
              {folder.name} ({folder.photoCount})
            </span>
            {folder.id !== 'all' && folder.id !== 'tagged' && (
              <div className="clean-folder-menu-container">
                <button
                  className="clean-folder-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderMenu(activeFolderMenu === folder.id ? null : folder.id);
                  }}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {activeFolderMenu === folder.id && (
                  <div className="clean-folder-dropdown">
                    <button
                      className="clean-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder);
                        setActiveFolderMenu(null);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      Renombrar
                    </button>
                    <button
                      className="clean-dropdown-item clean-dropdown-item--danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingFolder(folder);
                        setActiveFolderMenu(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <FolderModal
          mode="create"
          eventId={eventId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            onFoldersChange();
          }}
        />
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <FolderModal
          mode="edit"
          eventId={eventId}
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onSuccess={() => {
            setEditingFolder(null);
            onFoldersChange();
          }}
        />
      )}

      {/* Delete Folder Confirmation */}
      {deletingFolder && (
        <DeleteFolderModal
          folder={deletingFolder}
          onClose={() => setDeletingFolder(null)}
          onSuccess={() => {
            setDeletingFolder(null);
            onFoldersChange();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// FOLDER MODAL - Create/Edit folder
// =============================================================================
interface FolderModalProps {
  mode: 'create' | 'edit';
  eventId: string;
  folder?: EventFolder;
  onClose: () => void;
  onSuccess: () => void;
}

function FolderModal({ mode, eventId, folder, onClose, onSuccess }: FolderModalProps) {
  const [name, setName] = useState(folder?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        const response = await fetch(`/api/admin/events/${eventId}/folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al crear la carpeta');
        }
      } else if (folder) {
        const response = await fetch(`/api/admin/folders/${folder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al actualizar la carpeta');
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div className="clean-modal clean-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="clean-modal-header">
          <h2 className="clean-modal-title">
            <FolderOpen className="w-5 h-5" />
            {mode === 'create' ? 'Nueva carpeta' : 'Renombrar carpeta'}
          </h2>
          <button className="clean-modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="clean-modal-body">
            <div className="clean-form-group">
              <label className="clean-form-label">Nombre de la carpeta</label>
              <input
                type="text"
                className="clean-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Sala A, Turno Mañana..."
                autoFocus
              />
              {error && (
                <p className="clean-form-error">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="clean-modal-footer">
            <button type="button" className="clean-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="clean-btn clean-btn--primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="clean-spinner clean-spinner--sm" />
                  {mode === 'create' ? 'Creando...' : 'Guardando...'}
                </>
              ) : (
                mode === 'create' ? 'Crear carpeta' : 'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// DELETE FOLDER MODAL - Confirm folder deletion
// =============================================================================
interface DeleteFolderModalProps {
  folder: EventFolder;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteFolderModal({ folder, onClose, onSuccess }: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [movePhotos, setMovePhotos] = useState(true);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const params = new URLSearchParams();
      if (!movePhotos) params.set('force', 'true');

      const response = await fetch(
        `/api/admin/folders/${folder.id}?${params.toString()}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar la carpeta');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar la carpeta');
    } finally {
      setIsDeleting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div className="clean-modal clean-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="clean-modal-header">
          <h2 className="clean-modal-title clean-modal-title--danger">
            <Trash2 className="w-5 h-5" />
            Eliminar carpeta
          </h2>
          <button className="clean-modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="clean-modal-body">
          <p className="clean-modal-text">
            ¿Estás seguro de que deseas eliminar la carpeta <strong>{folder.name}</strong>?
          </p>

          {folder.photoCount > 0 && (
            <div className="clean-modal-warning">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium">Esta carpeta contiene {folder.photoCount} foto{folder.photoCount !== 1 ? 's' : ''}</p>
                <div className="clean-radio-group mt-3">
                  <label className="clean-radio">
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={movePhotos}
                      onChange={() => setMovePhotos(true)}
                    />
                    <span className="clean-radio-label">Mover fotos a "All Photos"</span>
                  </label>
                  <label className="clean-radio">
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={!movePhotos}
                      onChange={() => setMovePhotos(false)}
                    />
                    <span className="clean-radio-label clean-radio-label--danger">
                      Eliminar fotos permanentemente
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="clean-modal-footer">
          <button className="clean-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="clean-btn clean-btn--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="clean-spinner clean-spinner--sm" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="clean-btn-icon" />
                Eliminar carpeta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings type for parsed settings
type ParsedSettings = {
  url?: string;
  password?: string;
  downloadEnabled?: boolean;
  favoriteEnabled?: boolean;
  storeEnabled?: boolean;
};

// Settings Tab Content (Sidebar)
function SettingsTabContent({
  settings,
  activeSection,
  onSectionChange,
}: {
  settings?: ParsedSettings;
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <div className="clean-settings-nav">
      <span className="clean-settings-label">SETTINGS</span>
      <nav className="clean-settings-menu">
        <SettingsMenuItem
          icon={<Settings />}
          label="General"
          active={activeSection === 'general'}
          onClick={() => onSectionChange('general')}
        />
        <SettingsMenuItem
          icon={<Lock />}
          label="Privacy"
          badge={settings?.password ? 'ON' : undefined}
          active={activeSection === 'privacy'}
          onClick={() => onSectionChange('privacy')}
        />
        <SettingsMenuItem
          icon={<Download />}
          label="Download"
          badge={settings?.downloadEnabled ? 'ON' : 'OFF'}
          active={activeSection === 'download'}
          onClick={() => onSectionChange('download')}
        />
        <SettingsMenuItem
          icon={<Heart />}
          label="Favorite"
          badge={settings?.favoriteEnabled ? 'ON' : 'OFF'}
          active={activeSection === 'favorite'}
          onClick={() => onSectionChange('favorite')}
        />
        <SettingsMenuItem
          icon={<ShoppingCart />}
          label="Store"
          badge={settings?.storeEnabled ? 'ON' : 'OFF'}
          active={activeSection === 'store'}
          onClick={() => onSectionChange('store')}
        />
      </nav>
    </div>
  );
}

function SettingsMenuItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'clean-settings-item',
        active && 'clean-settings-item--active'
      )}
    >
      <span className="clean-settings-item-icon">{icon}</span>
      <span className="clean-settings-item-label">{label}</span>
      {badge && (
        <span className={cn(
          'clean-settings-badge',
          badge === 'ON' ? 'clean-settings-badge--on' : 'clean-settings-badge--off'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// Design Tab Content (Sidebar)
function DesignTabContent({
  activeSection,
  onSectionChange,
}: {
  activeSection: DesignSection;
  onSectionChange: (section: DesignSection) => void;
}) {
  return (
    <div className="clean-settings-nav">
      <span className="clean-settings-label">DESIGN</span>
      <nav className="clean-settings-menu">
        <SettingsMenuItem
          icon={<ImageIcon />}
          label="Cover Style"
          active={activeSection === 'cover'}
          onClick={() => onSectionChange('cover')}
        />
        <SettingsMenuItem
          icon={<Palette />}
          label="Theme"
          active={activeSection === 'theme'}
          onClick={() => onSectionChange('theme')}
        />
        <SettingsMenuItem
          icon={<Grid3X3 />}
          label="Photos Layout"
          active={activeSection === 'layout'}
          onClick={() => onSectionChange('layout')}
        />
        <SettingsMenuItem
          icon={<Smartphone />}
          label="App Settings"
          active={activeSection === 'app'}
          onClick={() => onSectionChange('app')}
        />
      </nav>
    </div>
  );
}

// Activity Tab Content (Sidebar)
function ActivityTabContent() {
  return (
    <div className="clean-settings-nav">
      <span className="clean-settings-label">ACTIVITY</span>
      <p className="text-sm text-gray-500 px-4 py-2">
        Recent activity will appear here
      </p>
    </div>
  );
}

// Photo type for the grid
interface Photo {
  id: string;
  storage_path?: string;
  preview_path?: string;
  filename?: string;
  original_filename?: string;
  created_at?: string;
  metadata?: {
    taggedStudents?: { id: string; name: string }[];
    [key: string]: unknown;
  };
  photo_students?: { student_id: string }[];
}

// Upload item type for upload queue
interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  thumbnailUrl?: string;
  abortController?: AbortController;
}

// Helper to get Supabase storage URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const getStorageUrl = (path: string, bucket: string = 'photos') => {
  if (!path) return '';
  // If it's already a full URL, return as is
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// Photos View (Main Content) - Pixieset Style
function PhotosView({
  folder,
  eventId,
}: {
  folder: EventFolder;
  eventId: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [selectedPhotoForModal, setSelectedPhotoForModal] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced upload queue state
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const uploadingRef = useRef(false);

  // Fetch photos on mount
  useEffect(() => {
    const fetchPhotos = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/events/${eventId}/photos`);
        if (response.ok) {
          const data = await response.json();
          setPhotos(data.photos || []);
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhotos();
  }, [eventId]);

  // Get photo URL (preview or original)
  const getPhotoUrl = (photo: Photo) => {
    if (photo.preview_path) {
      return getStorageUrl(photo.preview_path, 'photos');
    }
    if (photo.storage_path) {
      return getStorageUrl(photo.storage_path, 'photos');
    }
    return '';
  };

  // Generate thumbnail URL for preview
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      await addFilesToQueue(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await addFilesToQueue(files);
    }
    // Reset input value to allow re-selecting same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add files to upload queue with thumbnails
  const addFilesToQueue = async (files: File[]) => {
    const newItems: UploadItem[] = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending' as const,
        progress: 0,
        thumbnailUrl: await generateThumbnail(file),
      }))
    );

    setUploadQueue(prev => [...prev, ...newItems]);
    setShowUploadPanel(true);

    // Start processing queue if not already processing
    if (!uploadingRef.current) {
      processUploadQueue(newItems.map(item => item.id));
    }
  };

  // Process upload queue - upload files one by one
  const processUploadQueue = async (itemIds?: string[]) => {
    uploadingRef.current = true;

    // Get pending items to process
    const getNextPending = () => {
      return uploadQueue.find(item => item.status === 'pending');
    };

    // Use a while loop to process items
    let pendingItem = getNextPending();

    // If itemIds are provided, process those specific items
    if (itemIds && itemIds.length > 0) {
      for (const itemId of itemIds) {
        await uploadSingleFile(itemId);
      }
    } else {
      // Otherwise process all pending items
      while (pendingItem) {
        await uploadSingleFile(pendingItem.id);
        pendingItem = getNextPending();
      }
    }

    uploadingRef.current = false;
  };

  // Upload single file with progress tracking
  const uploadSingleFile = async (itemId: string) => {
    // Find the item in current state
    const item = uploadQueue.find(i => i.id === itemId);
    if (!item || item.status !== 'pending') return;

    const abortController = new AbortController();

    // Update status to uploading
    setUploadQueue(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, status: 'uploading' as const, abortController }
        : i
    ));

    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('eventId', eventId);

    try {
      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<{ success: boolean; photo?: Photo; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadQueue(prev => prev.map(i =>
              i.id === itemId ? { ...i, progress } : i
            ));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({ success: true, photo: response });
            } catch {
              resolve({ success: true, photo: undefined });
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              resolve({ success: false, error: error.message || 'Upload failed' });
            } catch {
              resolve({ success: false, error: 'Upload failed' });
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        // Listen for abort signal
        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        xhr.open('POST', '/api/admin/photos/upload');
        xhr.send(formData);
      });

      if (result.success && result.photo) {
        setPhotos(prev => [result.photo!, ...prev]);
        setUploadQueue(prev => prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'completed' as const, progress: 100 }
            : i
        ));
      } else {
        setUploadQueue(prev => prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'failed' as const, error: result.error || 'Upload failed' }
            : i
        ));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (errorMessage !== 'Upload cancelled') {
        setUploadQueue(prev => prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'failed' as const, error: errorMessage }
            : i
        ));
      } else {
        // Remove cancelled item from queue
        setUploadQueue(prev => prev.filter(i => i.id !== itemId));
      }
    }
  };

  // Cancel single upload
  const cancelUpload = (itemId: string) => {
    const item = uploadQueue.find(i => i.id === itemId);
    if (item?.abortController) {
      item.abortController.abort();
    }
    setUploadQueue(prev => prev.filter(i => i.id !== itemId));
  };

  // Retry failed upload
  const retryUpload = (itemId: string) => {
    setUploadQueue(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, status: 'pending' as const, progress: 0, error: undefined }
        : i
    ));
    // Trigger processing
    processUploadQueue([itemId]);
  };

  // Remove completed/failed from queue
  const removeFromQueue = (itemId: string) => {
    setUploadQueue(prev => prev.filter(i => i.id !== itemId));
  };

  // Clear completed uploads
  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(i => i.status !== 'completed'));
  };

  // Cancel all pending uploads
  const cancelAllPending = () => {
    uploadQueue.forEach(item => {
      if (item.status === 'uploading' && item.abortController) {
        item.abortController.abort();
      }
    });
    setUploadQueue(prev => prev.filter(i => i.status === 'completed' || i.status === 'failed'));
  };

  // Calculate overall progress
  const uploadStats = {
    total: uploadQueue.length,
    completed: uploadQueue.filter(i => i.status === 'completed').length,
    failed: uploadQueue.filter(i => i.status === 'failed').length,
    pending: uploadQueue.filter(i => i.status === 'pending').length,
    uploading: uploadQueue.filter(i => i.status === 'uploading').length,
  };

  const isUploading = uploadStats.uploading > 0 || uploadStats.pending > 0;

  // Auto-hide panel when all uploads complete
  useEffect(() => {
    if (uploadQueue.length > 0 && uploadStats.pending === 0 && uploadStats.uploading === 0) {
      // Keep panel visible for a moment to show completion
      const timer = setTimeout(() => {
        if (uploadStats.failed === 0) {
          clearCompleted();
          setShowUploadPanel(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadQueue, uploadStats]);

  // Handle photo click - open modal on single click, select with modifiers
  const handlePhotoClick = (photo: Photo, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Multi-select mode
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(photo.id)) {
          newSet.delete(photo.id);
        } else {
          newSet.add(photo.id);
        }
        return newSet;
      });
    } else {
      // Open modal for single click
      setSelectedPhotoForModal(photo);
    }
  };

  // Toggle selection via checkbox
  const togglePhotoSelection = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  // Handle photo delete from modal
  const handlePhotoDelete = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  // Navigate to photo in modal
  const handleModalNavigate = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      setSelectedPhotoForModal(photo);
    }
  };

  // Select all photos
  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  // Delete selected photos
  const deleteSelected = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedPhotos.size} foto(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedPhotos).map(id =>
          fetch(`/api/admin/photos/${id}`, { method: 'DELETE' })
        )
      );
      setPhotos(prev => prev.filter(p => !selectedPhotos.has(p.id)));
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Download selected photos
  const downloadSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id));

    for (const photo of selectedPhotosList) {
      const url = photo.storage_path
        ? getStorageUrl(photo.storage_path, 'photos')
        : photo.preview_path
          ? getStorageUrl(photo.preview_path, 'photos')
          : null;

      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = photo.original_filename || photo.filename || `photo-${photo.id}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  // Bulk tag state
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);

  // Move to folder state
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'tagged' | 'untagged'>('all');

  // Sort state
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'manual'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filter photos based on search and filters
  const filteredPhotos = photos.filter(photo => {
    // Search by filename
    if (searchQuery) {
      const filename = (photo.original_filename || photo.filename || '').toLowerCase();
      if (!filename.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    // Filter by status (tagged/untagged)
    if (filterStatus === 'tagged') {
      // Check if photo has tags (based on metadata or photo_students relation)
      const taggedStudentsLength = photo.metadata?.taggedStudents?.length ?? 0;
      const photoStudentsLength = photo.photo_students?.length ?? 0;
      const hasTags = taggedStudentsLength > 0 || photoStudentsLength > 0;
      if (!hasTags) return false;
    } else if (filterStatus === 'untagged') {
      const taggedStudentsLength = photo.metadata?.taggedStudents?.length ?? 0;
      const photoStudentsLength = photo.photo_students?.length ?? 0;
      const hasTags = taggedStudentsLength > 0 || photoStudentsLength > 0;
      if (hasTags) return false;
    }

    return true;
  });

  // Sort photos
  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'date') {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      comparison = dateA - dateB;
    } else if (sortBy === 'name') {
      const nameA = (a.original_filename || a.filename || '').toLowerCase();
      const nameB = (b.original_filename || b.filename || '').toLowerCase();
      comparison = nameA.localeCompare(nameB);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const gridSizeClass = {
    small: 'clean-photos-grid--small',
    medium: 'clean-photos-grid--medium',
    large: 'clean-photos-grid--large',
  }[gridSize];

  return (
    <div
      className={cn('clean-photos-view', isDragging && 'clean-photos-view--dragging')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - Standard toolbar */}
      <div className="clean-photos-header">
        <div className="clean-photos-header-left">
          <h2 className="clean-photos-title">{folder.name}</h2>
          <span className="clean-photos-count">
            {sortedPhotos.length} {sortedPhotos.length === 1 ? 'foto' : 'fotos'}
          </span>
        </div>
        <div className="clean-photos-actions">
          {/* Search */}
          <div className="clean-search-container">
            <Search className="clean-search-icon" />
            <input
              type="text"
              placeholder="Buscar fotos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clean-search-input"
            />
            {searchQuery && (
              <button
                className="clean-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter dropdown */}
          <div className="clean-dropdown-container">
            <button
              className={cn(
                'clean-photos-action',
                filterStatus !== 'all' && 'clean-photos-action--active'
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtrar
              {filterStatus !== 'all' && (
                <span className="clean-badge">{filterStatus === 'tagged' ? 'Etiquetadas' : 'Sin etiquetar'}</span>
              )}
            </button>
            {showFilters && (
              <div className="clean-dropdown-menu">
                <button
                  className={cn('clean-dropdown-item', filterStatus === 'all' && 'clean-dropdown-item--active')}
                  onClick={() => { setFilterStatus('all'); setShowFilters(false); }}
                >
                  Todas las fotos
                </button>
                <button
                  className={cn('clean-dropdown-item', filterStatus === 'tagged' && 'clean-dropdown-item--active')}
                  onClick={() => { setFilterStatus('tagged'); setShowFilters(false); }}
                >
                  <Tag className="w-4 h-4" />
                  Etiquetadas
                </button>
                <button
                  className={cn('clean-dropdown-item', filterStatus === 'untagged' && 'clean-dropdown-item--active')}
                  onClick={() => { setFilterStatus('untagged'); setShowFilters(false); }}
                >
                  <XCircle className="w-4 h-4" />
                  Sin etiquetar
                </button>
              </div>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="clean-dropdown-container">
            <button
              className="clean-photos-action"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
            >
              <ArrowUpDown className="w-4 h-4" />
              Ordenar
            </button>
            {showSortDropdown && (
              <div className="clean-dropdown-menu">
                <button
                  className={cn('clean-dropdown-item', sortBy === 'date' && 'clean-dropdown-item--active')}
                  onClick={() => { setSortBy('date'); setShowSortDropdown(false); }}
                >
                  <Calendar className="w-4 h-4" />
                  Por fecha
                  {sortBy === 'date' && (
                    sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 ml-auto" /> : <ArrowUp className="w-3 h-3 ml-auto" />
                  )}
                </button>
                <button
                  className={cn('clean-dropdown-item', sortBy === 'name' && 'clean-dropdown-item--active')}
                  onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                >
                  <Type className="w-4 h-4" />
                  Por nombre
                  {sortBy === 'name' && (
                    sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 ml-auto" /> : <ArrowUp className="w-3 h-3 ml-auto" />
                  )}
                </button>
                <div className="clean-dropdown-divider" />
                <button
                  className={cn('clean-dropdown-item', sortOrder === 'asc' && 'clean-dropdown-item--active')}
                  onClick={() => { setSortOrder('asc'); setShowSortDropdown(false); }}
                >
                  <ArrowUp className="w-4 h-4" />
                  Ascendente
                </button>
                <button
                  className={cn('clean-dropdown-item', sortOrder === 'desc' && 'clean-dropdown-item--active')}
                  onClick={() => { setSortOrder('desc'); setShowSortDropdown(false); }}
                >
                  <ArrowDown className="w-4 h-4" />
                  Descendente
                </button>
              </div>
            )}
          </div>

          {/* Grid size toggle */}
          <div className="clean-grid-size-toggle">
            <button
              className={cn('clean-grid-btn', gridSize === 'small' && 'clean-grid-btn--active')}
              onClick={() => setGridSize('small')}
              title="Small grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              className={cn('clean-grid-btn', gridSize === 'medium' && 'clean-grid-btn--active')}
              onClick={() => setGridSize('medium')}
              title="Medium grid"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              className={cn('clean-grid-btn', gridSize === 'large' && 'clean-grid-btn--active')}
              onClick={() => setGridSize('large')}
              title="Large grid"
            >
              <Grid3X3 className="w-6 h-6" />
            </button>
          </div>

          {/* Add media button */}
          <button
            className="clean-photos-action clean-photos-action--primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-4 h-4" />
            Subir fotos
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar - appears when photos selected */}
      {selectedPhotos.size > 0 && (
        <div className="clean-bulk-toolbar">
          <div className="clean-bulk-toolbar-left">
            <button
              className="clean-bulk-checkbox"
              onClick={selectAll}
            >
              {selectedPhotos.size === photos.length ? (
                <CheckCircle className="w-5 h-5 text-teal-500" />
              ) : (
                <div className="clean-bulk-checkbox-partial" />
              )}
            </button>
            <span className="clean-bulk-count">
              {selectedPhotos.size} {selectedPhotos.size === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
            </span>
            <button
              className="clean-bulk-select-all"
              onClick={selectAll}
            >
              {selectedPhotos.size === photos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
          <div className="clean-bulk-toolbar-actions">
            <button
              className="clean-bulk-action"
              onClick={downloadSelected}
              title="Descargar seleccionadas"
            >
              <Download className="w-4 h-4" />
              <span className="clean-bulk-action-text">Descargar</span>
            </button>
            <button
              className="clean-bulk-action"
              onClick={() => setShowBulkTagModal(true)}
              title="Etiquetar seleccionadas"
            >
              <Tag className="w-4 h-4" />
              <span className="clean-bulk-action-text">Etiquetar</span>
            </button>
            <button
              className="clean-bulk-action"
              onClick={() => setShowMoveModal(true)}
              title="Mover a otra carpeta"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="clean-bulk-action-text">Mover</span>
            </button>
            <div className="clean-bulk-divider" />
            <button
              className="clean-bulk-action clean-bulk-action--danger"
              onClick={deleteSelected}
              title="Eliminar seleccionadas"
            >
              <Trash2 className="w-4 h-4" />
              <span className="clean-bulk-action-text">Eliminar</span>
            </button>
          </div>
          <button
            className="clean-bulk-close"
            onClick={() => setSelectedPhotos(new Set())}
            title="Cancelar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Enhanced Upload Panel */}
      {showUploadPanel && uploadQueue.length > 0 && (
        <div className="clean-upload-panel">
          <div className="clean-upload-panel-header">
            <div className="clean-upload-panel-title">
              <span className="clean-upload-panel-count">
                {isUploading ? (
                  <>
                    <div className="clean-spinner clean-spinner--sm" />
                    Subiendo {uploadStats.uploading + uploadStats.pending} de {uploadStats.total}
                  </>
                ) : uploadStats.failed > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    {uploadStats.failed} fallido{uploadStats.failed !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {uploadStats.completed} completado{uploadStats.completed !== 1 ? 's' : ''}
                  </>
                )}
              </span>
            </div>
            <div className="clean-upload-panel-actions">
              {uploadStats.completed > 0 && (
                <button
                  className="clean-upload-panel-btn"
                  onClick={clearCompleted}
                  title="Limpiar completados"
                >
                  Limpiar
                </button>
              )}
              {isUploading && (
                <button
                  className="clean-upload-panel-btn clean-upload-panel-btn--danger"
                  onClick={cancelAllPending}
                  title="Cancelar todo"
                >
                  Cancelar todo
                </button>
              )}
              <button
                className="clean-upload-panel-close"
                onClick={() => {
                  if (!isUploading) {
                    setShowUploadPanel(false);
                    setUploadQueue([]);
                  }
                }}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="clean-upload-panel-list">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'clean-upload-item',
                  `clean-upload-item--${item.status}`
                )}
              >
                {/* Thumbnail preview */}
                <div className="clean-upload-item-thumb">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.file.name}
                      className="clean-upload-item-img"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                  {/* Status overlay */}
                  {item.status === 'uploading' && (
                    <div className="clean-upload-item-overlay">
                      <div className="clean-spinner clean-spinner--sm clean-spinner--white" />
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <div className="clean-upload-item-overlay clean-upload-item-overlay--success">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className="clean-upload-item-overlay clean-upload-item-overlay--error">
                      <XCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="clean-upload-item-info">
                  <span className="clean-upload-item-name" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <div className="clean-upload-item-meta">
                    {item.status === 'pending' && (
                      <span className="clean-upload-item-status">En cola</span>
                    )}
                    {item.status === 'uploading' && (
                      <>
                        <span className="clean-upload-item-status">{item.progress}%</span>
                        <div className="clean-upload-item-progress-bar">
                          <div
                            className="clean-upload-item-progress-fill"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </>
                    )}
                    {item.status === 'completed' && (
                      <span className="clean-upload-item-status clean-upload-item-status--success">
                        Completado
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="clean-upload-item-status clean-upload-item-status--error">
                        {item.error || 'Error'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="clean-upload-item-actions">
                  {(item.status === 'pending' || item.status === 'uploading') && (
                    <button
                      className="clean-upload-item-action"
                      onClick={() => cancelUpload(item.id)}
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === 'failed' && (
                    <>
                      <button
                        className="clean-upload-item-action clean-upload-item-action--retry"
                        onClick={() => retryUpload(item.id)}
                        title="Reintentar"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        className="clean-upload-item-action"
                        onClick={() => removeFromQueue(item.id)}
                        title="Eliminar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {item.status === 'completed' && (
                    <button
                      className="clean-upload-item-action"
                      onClick={() => removeFromQueue(item.id)}
                      title="Quitar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          {isUploading && (
            <div className="clean-upload-panel-progress">
              <div className="clean-upload-panel-progress-bar">
                <div
                  className="clean-upload-panel-progress-fill"
                  style={{
                    width: `${(uploadStats.completed / uploadStats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="clean-drag-overlay">
          <div className="clean-drag-content">
            <Plus className="w-12 h-12 text-teal-500 mb-4" />
            <p className="text-lg font-medium">Drop photos here to upload</p>
            <p className="text-sm text-gray-500">or click Add Media</p>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      <div className={cn('clean-photos-grid', gridSizeClass)}>
        {isLoading ? (
          // Loading skeleton
          <div className="clean-photos-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="clean-photo-skeleton" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="clean-photos-empty">
            <div className="clean-photos-empty-icon">
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No hay fotos en este set
            </h3>
            <p className="text-gray-500 mb-6">
              Arrastra fotos aquí o haz clic en el botón de abajo
            </p>
            <button
              className="clean-btn clean-btn--primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="clean-btn-icon" />
              Subir fotos
            </button>
          </div>
        ) : sortedPhotos.length === 0 ? (
          <div className="clean-photos-empty">
            <div className="clean-photos-empty-icon">
              <Search className="w-16 h-16 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No se encontraron fotos
            </h3>
            <p className="text-gray-500 mb-6">
              Intenta con otros términos de búsqueda o ajusta los filtros
            </p>
            <button
              className="clean-btn"
              onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="clean-photos-masonry">
            {sortedPhotos.map((photo) => {
              const photoUrl = getPhotoUrl(photo);
              return (
                <div
                  key={photo.id}
                  className={cn(
                    'clean-photo-item',
                    selectedPhotos.has(photo.id) && 'clean-photo-item--selected'
                  )}
                  onClick={(e) => handlePhotoClick(photo, e)}
                >
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={photo.original_filename || photo.filename || 'Photo'}
                      fill
                      className="clean-photo-img"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="clean-photo-placeholder-inner">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="clean-photo-overlay">
                    <div
                      className={cn(
                        'clean-photo-checkbox',
                        selectedPhotos.has(photo.id) && 'clean-photo-checkbox--checked'
                      )}
                      onClick={(e) => togglePhotoSelection(photo.id, e)}
                    >
                      {selectedPhotos.has(photo.id) && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      {selectedPhotoForModal && (
        <PhotoDetailModal
          photo={selectedPhotoForModal}
          photos={photos}
          eventId={eventId}
          onClose={() => setSelectedPhotoForModal(null)}
          onDelete={handlePhotoDelete}
          onNavigate={handleModalNavigate}
        />
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <BulkTagModal
          selectedPhotoIds={Array.from(selectedPhotos)}
          eventId={eventId}
          onClose={() => setShowBulkTagModal(false)}
          onSuccess={() => {
            setShowBulkTagModal(false);
            // Optionally refresh photos to show updated tags
          }}
        />
      )}

      {/* Move to Folder Modal */}
      {showMoveModal && (
        <MoveToFolderModal
          selectedPhotoIds={Array.from(selectedPhotos)}
          eventId={eventId}
          currentFolderId={folder.id}
          onClose={() => setShowMoveModal(false)}
          onSuccess={() => {
            setShowMoveModal(false);
            // Remove moved photos from current view
            setPhotos(prev => prev.filter(p => !selectedPhotos.has(p.id)));
            setSelectedPhotos(new Set());
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// BULK TAG MODAL - Tag multiple photos at once
// =============================================================================
interface BulkTagModalProps {
  selectedPhotoIds: string[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkTagModal({ selectedPhotoIds, eventId, onClose, onSuccess }: BulkTagModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<{ id: string; name: string; class_name?: string }[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isTagging, setIsTagging] = useState(false);

  // Search students
  useEffect(() => {
    if (searchQuery.length < 2) {
      setStudents([]);
      return;
    }

    const searchStudents = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/students/search?q=${encodeURIComponent(searchQuery)}&event_id=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Failed to search students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, eventId]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleBulkTag = async () => {
    if (selectedStudents.size === 0) return;

    setIsTagging(true);
    try {
      // Tag each photo with each selected student
      for (const photoId of selectedPhotoIds) {
        for (const studentId of selectedStudents) {
          await fetch(`/api/admin/photos/${photoId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId }),
          });
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to bulk tag photos:', error);
    } finally {
      setIsTagging(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div className="clean-modal clean-modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="clean-modal-header">
          <h2 className="clean-modal-title">
            <Tag className="w-5 h-5" />
            Etiquetar {selectedPhotoIds.length} foto{selectedPhotoIds.length !== 1 ? 's' : ''}
          </h2>
          <button className="clean-modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="clean-modal-body">
          <div className="clean-form-group">
            <label className="clean-form-label">Buscar estudiantes</label>
            <div className="clean-search-container" style={{ width: '100%' }}>
              <Search className="clean-search-icon" />
              <input
                type="text"
                placeholder="Nombre del estudiante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="clean-search-input"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
          </div>

          {/* Search Results */}
          {isLoading ? (
            <div className="clean-loading">
              <div className="clean-spinner" />
              Buscando...
            </div>
          ) : students.length > 0 ? (
            <div className="clean-list clean-list--selectable">
              {students.map((student) => (
                <button
                  key={student.id}
                  className={cn(
                    'clean-list-item',
                    selectedStudents.has(student.id) && 'clean-list-item--selected'
                  )}
                  onClick={() => toggleStudent(student.id)}
                >
                  <div className="clean-list-item-content">
                    <span className="clean-list-item-title">{student.name}</span>
                    {student.class_name && (
                      <span className="clean-list-item-subtitle">{student.class_name}</span>
                    )}
                  </div>
                  {selectedStudents.has(student.id) && (
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="clean-empty-state">
              <Users className="w-8 h-8 text-gray-400" />
              <p>No se encontraron estudiantes</p>
            </div>
          ) : (
            <div className="clean-empty-state">
              <Users className="w-8 h-8 text-gray-400" />
              <p>Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}

          {/* Selected Students Summary */}
          {selectedStudents.size > 0 && (
            <div className="clean-selected-summary">
              <span className="clean-selected-count">
                {selectedStudents.size} estudiante{selectedStudents.size !== 1 ? 's' : ''} seleccionado{selectedStudents.size !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="clean-modal-footer">
          <button className="clean-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="clean-btn clean-btn--primary"
            onClick={handleBulkTag}
            disabled={selectedStudents.size === 0 || isTagging}
          >
            {isTagging ? (
              <>
                <div className="clean-spinner clean-spinner--sm" />
                Etiquetando...
              </>
            ) : (
              <>
                <Tag className="clean-btn-icon" />
                Etiquetar fotos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MOVE TO FOLDER MODAL - Move photos to another folder
// =============================================================================
interface MoveToFolderModalProps {
  selectedPhotoIds: string[];
  eventId: string;
  currentFolderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function MoveToFolderModal({ selectedPhotoIds, eventId, currentFolderId, onClose, onSuccess }: MoveToFolderModalProps) {
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  // Fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch(`/api/admin/events/${eventId}/folders`);
        if (response.ok) {
          const data = await response.json();
          // Filter out current folder
          setFolders((data.folders || []).filter((f: { id: string }) => f.id !== currentFolderId));
        }
      } catch (error) {
        console.error('Failed to fetch folders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFolders();
  }, [eventId, currentFolderId]);

  const handleMove = async () => {
    if (!selectedFolderId) return;

    setIsMoving(true);
    try {
      // Move photos to selected folder
      await fetch(`/api/admin/photos/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: selectedPhotoIds,
          folder_id: selectedFolderId,
        }),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to move photos:', error);
    } finally {
      setIsMoving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div className="clean-modal clean-modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="clean-modal-header">
          <h2 className="clean-modal-title">
            <FolderOpen className="w-5 h-5" />
            Mover {selectedPhotoIds.length} foto{selectedPhotoIds.length !== 1 ? 's' : ''}
          </h2>
          <button className="clean-modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="clean-modal-body">
          {isLoading ? (
            <div className="clean-loading">
              <div className="clean-spinner" />
              Cargando carpetas...
            </div>
          ) : folders.length > 0 ? (
            <div className="clean-list clean-list--selectable">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className={cn(
                    'clean-list-item',
                    selectedFolderId === folder.id && 'clean-list-item--selected'
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="clean-list-item-content">
                    <FolderOpen className="w-5 h-5 text-gray-400" />
                    <span className="clean-list-item-title">{folder.name}</span>
                  </div>
                  {selectedFolderId === folder.id && (
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="clean-empty-state">
              <FolderOpen className="w-8 h-8 text-gray-400" />
              <p>No hay otras carpetas disponibles</p>
            </div>
          )}
        </div>
        <div className="clean-modal-footer">
          <button className="clean-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="clean-btn clean-btn--primary"
            onClick={handleMove}
            disabled={!selectedFolderId || isMoving}
          >
            {isMoving ? (
              <>
                <div className="clean-spinner clean-spinner--sm" />
                Moviendo...
              </>
            ) : (
              <>
                <FolderOpen className="clean-btn-icon" />
                Mover fotos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings View (Main Content)
function SettingsView({
  eventId,
  settings,
  activeSection,
}: {
  eventId: string;
  settings?: ParsedSettings;
  activeSection: SettingsSection;
}) {
  return (
    <div className="clean-settings-view">
      {activeSection === 'general' && (
        <GeneralSettingsSection eventId={eventId} settings={settings} />
      )}
      {activeSection === 'privacy' && (
        <PrivacySettingsSection settings={settings} />
      )}
      {activeSection === 'download' && (
        <DownloadSettingsSection settings={settings} />
      )}
      {activeSection === 'favorite' && (
        <FavoriteSettingsSection settings={settings} />
      )}
      {activeSection === 'store' && (
        <StoreSettingsSection settings={settings} />
      )}
    </div>
  );
}

// General Settings Section
function GeneralSettingsSection({
  eventId,
  settings,
}: {
  eventId: string;
  settings?: ParsedSettings;
}) {
  return (
    <>
      <h2 className="clean-settings-title">
        General Settings
        <span className="clean-settings-info">&#9432;</span>
      </h2>

      <div className="clean-settings-form">
        <SettingsField
          label="Collection Contact"
          description="Link this collection to one or more contacts and view in Studio Manager."
          action={
            <button className="clean-link-btn">
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          }
        />

        <SettingsField
          label="Collection URL"
          description="Choose a unique url for visitors to access your collection."
        >
          <input
            type="text"
            className="clean-input"
            defaultValue={settings?.url || eventId}
            placeholder="collection-url"
          />
        </SettingsField>

        <SettingsField
          label="Category Tags"
          description="Add tags to categorize different collections e.g. wedding, outdoor, summer."
        >
          <input
            type="text"
            className="clean-input"
            placeholder="Select or enter tags"
          />
        </SettingsField>

        <SettingsField
          label="Default Watermark"
          description="Set the default watermark to apply to photos."
        >
          <select className="clean-select">
            <option>No watermark</option>
            <option>Logo watermark</option>
            <option>Text watermark</option>
          </select>
        </SettingsField>

        <SettingsField
          label="Auto Expiry"
          description="Automatically set your collection to hidden on a specific date."
        >
          <input
            type="date"
            className="clean-input"
            placeholder="Optional"
          />
        </SettingsField>

        <SettingsToggle
          label="Email Registration"
          description="Track email addresses accessing this collection."
          defaultChecked={false}
        />

        <SettingsToggle
          label="Gallery Assist"
          description="Enable AI-powered photo organization suggestions."
          defaultChecked={true}
        />
      </div>
    </>
  );
}

// Privacy Settings Section
function PrivacySettingsSection({ settings }: { settings?: ParsedSettings }) {
  return (
    <>
      <h2 className="clean-settings-title">
        Privacy Settings
        <span className="clean-settings-info">&#9432;</span>
      </h2>

      <div className="clean-settings-form">
        <SettingsToggle
          label="Password Protection"
          description="Require a password to access this collection."
          defaultChecked={Boolean(settings?.password)}
        />

        {settings?.password && (
          <SettingsField
            label="Password"
            description="Enter the password visitors will need to access this gallery."
          >
            <input
              type="password"
              className="clean-input"
              defaultValue={settings.password}
              placeholder="Enter password"
            />
          </SettingsField>
        )}

        <SettingsToggle
          label="Hide from Search Engines"
          description="Prevent search engines from indexing this gallery."
          defaultChecked={true}
        />

        <SettingsToggle
          label="Require Email to View"
          description="Visitors must enter their email before viewing photos."
          defaultChecked={false}
        />
      </div>
    </>
  );
}

// Download Settings Section
function DownloadSettingsSection({ settings }: { settings?: ParsedSettings }) {
  return (
    <>
      <h2 className="clean-settings-title">
        Download Settings
        <span className="clean-settings-info">&#9432;</span>
      </h2>

      <div className="clean-settings-form">
        <SettingsToggle
          label="Enable Downloads"
          description="Allow visitors to download photos from this collection."
          defaultChecked={settings?.downloadEnabled}
        />

        <SettingsField
          label="Download Resolution"
          description="Choose the maximum resolution available for downloads."
        >
          <select className="clean-select">
            <option value="web">Web Size (1200px)</option>
            <option value="print">Print Size (3000px)</option>
            <option value="original">Original Size</option>
          </select>
        </SettingsField>

        <SettingsField
          label="Download Limit"
          description="Limit the number of downloads per visitor (0 for unlimited)."
        >
          <input
            type="number"
            className="clean-input"
            defaultValue={0}
            min={0}
            placeholder="0"
          />
        </SettingsField>

        <SettingsToggle
          label="Include Watermark"
          description="Add watermark to downloaded photos."
          defaultChecked={false}
        />
      </div>
    </>
  );
}

// Favorite Settings Section
function FavoriteSettingsSection({ settings }: { settings?: ParsedSettings }) {
  return (
    <>
      <h2 className="clean-settings-title">
        Favorite Settings
        <span className="clean-settings-info">&#9432;</span>
      </h2>

      <div className="clean-settings-form">
        <SettingsToggle
          label="Enable Favorites"
          description="Allow visitors to mark photos as favorites."
          defaultChecked={settings?.favoriteEnabled}
        />

        <SettingsToggle
          label="Notify on Favorites"
          description="Receive email notifications when visitors add favorites."
          defaultChecked={true}
        />

        <SettingsField
          label="Favorites Per Session"
          description="Limit the number of favorites per visitor (0 for unlimited)."
        >
          <input
            type="number"
            className="clean-input"
            defaultValue={0}
            min={0}
            placeholder="0"
          />
        </SettingsField>
      </div>
    </>
  );
}

// Store Settings Section
function StoreSettingsSection({ settings }: { settings?: ParsedSettings }) {
  const [storeEnabled, setStoreEnabled] = useState(settings?.storeEnabled ?? false);

  return (
    <>
      <h2 className="clean-settings-title">
        Store Settings
        <span className="clean-settings-info">&#9432;</span>
      </h2>

      {/* Warning banner */}
      {storeEnabled && (
        <div className="clean-warning-banner">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700">Your Store checkout is currently unavailable</p>
            <p className="text-sm text-amber-600">
              You need to set up at least one payment method to start accepting orders.
              Visit Store {'>'} Settings to get started.{' '}
              <a href="#" className="text-teal-600 hover:underline">Learn more</a>
            </p>
            <a href="#" className="text-teal-500 text-sm font-medium hover:underline">
              Connect payment method
            </a>
          </div>
        </div>
      )}

      <div className="clean-settings-form">
        <div className="clean-settings-field">
          <label className="clean-settings-field-label">Store Status</label>
          <div className="clean-toggle-row">
            <button
              onClick={() => setStoreEnabled(!storeEnabled)}
              className={cn('clean-toggle', storeEnabled && 'clean-toggle--active')}
            >
              <span className="clean-toggle-knob" />
            </button>
            <span className="clean-toggle-label">{storeEnabled ? 'On' : 'Off'}</span>
          </div>
          <p className="clean-settings-field-desc">
            Allow visitors to purchase products for photos from this collection.
          </p>
        </div>

        <SettingsField
          label="Price Sheet"
          description="Set which products are for sale in this collection."
        >
          <select className="clean-select">
            <option>Paquetes Escolares</option>
            <option>Standard Prints</option>
            <option>Digital Downloads</option>
            <option>Premium Package</option>
          </select>
          <p className="clean-settings-field-desc mt-2">
            Manage price sheets in{' '}
            <a href="#" className="text-teal-500 hover:underline">Store</a>
          </p>
        </SettingsField>

        <div className="clean-feature-card">
          <div className="clean-feature-card-header">
            <Sparkles className="w-5 h-5 text-teal-500" />
            <h3 className="clean-feature-card-title">Personalized Product Preview</h3>
          </div>
          <p className="clean-feature-card-desc">
            This feature is only available with a lab price sheet on our next generation Store system.
            Create a new Price Sheet to gain full access to all the all-new Store experience or select
            existing price sheet that matches requirements.
          </p>
        </div>

        <SettingsToggle
          label="Auto-add to Cart"
          description="Automatically add suggested products to visitor's cart."
          defaultChecked={false}
        />

        <SettingsToggle
          label="Show Prices on Gallery"
          description="Display product prices on the photo gallery view."
          defaultChecked={true}
        />
      </div>
    </>
  );
}

function SettingsField({
  label,
  description,
  action,
  children,
}: {
  label: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="clean-settings-field">
      <label className="clean-settings-field-label">{label}</label>
      {children}
      {description && (
        <p className="clean-settings-field-desc">
          {description}
          {action && <span className="ml-1">{action}</span>}
        </p>
      )}
      {!children && action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="clean-settings-field">
      <label className="clean-settings-field-label">{label}</label>
      <div className="clean-toggle-row">
        <button
          onClick={() => setChecked(!checked)}
          className={cn('clean-toggle', checked && 'clean-toggle--active')}
        >
          <span className="clean-toggle-knob" />
        </button>
        <span className="clean-toggle-label">{checked ? 'On' : 'Off'}</span>
      </div>
      {description && (
        <p className="clean-settings-field-desc">{description}</p>
      )}
    </div>
  );
}

// Design View (Main Content)
function DesignView({
  event,
  activeSection,
  showMobilePreview,
  onToggleMobilePreview,
}: {
  event: EventRow;
  activeSection: DesignSection;
  showMobilePreview: boolean;
  onToggleMobilePreview: () => void;
}) {
  return (
    <div className="clean-design-view">
      {/* Preview Toggle Button */}
      <div className="clean-design-header">
        <button
          onClick={onToggleMobilePreview}
          className={cn(
            'clean-preview-toggle',
            showMobilePreview && 'clean-preview-toggle--active'
          )}
        >
          <Smartphone className="w-4 h-4" />
          {showMobilePreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {activeSection === 'cover' && <CoverStyleSection event={event} />}
      {activeSection === 'theme' && <ThemeSection event={event} />}
      {activeSection === 'layout' && <LayoutSection />}
      {activeSection === 'app' && <AppSettingsSection event={event} />}
    </div>
  );
}

// Cover Style Section
function CoverStyleSection({ event }: { event: EventRow }) {
  // Read initial cover style from event metadata
  const getInitialCoverStyle = (): CoverStyle => {
    const metadata = event.metadata as Record<string, unknown> | null;
    if (metadata && typeof metadata.coverStyle === 'string') {
      const style = metadata.coverStyle as string;
      if (style === 'full' || style === 'third' || style === 'none') {
        return style;
      }
    }
    return 'full'; // default
  };

  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>(getInitialCoverStyle);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const coverStyles: { id: CoverStyle; label: string }[] = [
    { id: 'full', label: 'Full' },
    { id: 'third', label: 'Third' },
    { id: 'none', label: 'None' },
  ];

  const handleStyleChange = async (styleId: CoverStyle) => {
    if (styleId === selectedStyle || isSaving) return;

    setSelectedStyle(styleId);
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Merge with existing metadata
      const currentMetadata = (event.metadata as Record<string, unknown>) || {};
      const newMetadata = {
        ...currentMetadata,
        coverStyle: styleId,
      };

      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: newMetadata }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setSaveMessage({ type: 'success', text: 'Cover style saved' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to save cover style:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save' });
      // Revert on error
      setSelectedStyle(getInitialCoverStyle());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <h2 className="clean-settings-title">Cover Style</h2>

      <div className="clean-design-section">
        <div className="clean-cover-style-header">
          <span className="clean-label">Photo Cover</span>
          <div className="clean-cover-actions">
            {saveMessage && (
              <span className={cn(
                'text-sm mr-2',
                saveMessage.type === 'success' ? 'text-teal-600' : 'text-red-500'
              )}>
                {saveMessage.text}
              </span>
            )}
            {isSaving && (
              <span className="text-sm text-gray-400 mr-2">Saving...</span>
            )}
            <button className="clean-link-btn">
              <ImageIcon className="w-4 h-4" />
              Change photo
            </button>
            <button className="clean-link-btn">
              <span className="w-4 h-4 flex items-center justify-center">◎</span>
              Set focal
            </button>
          </div>
        </div>

        <div className="clean-cover-options">
          {coverStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              disabled={isSaving}
              className={cn(
                'clean-cover-option',
                selectedStyle === style.id && 'clean-cover-option--selected',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="clean-cover-preview">
                {style.id === 'full' && (
                  <div className="clean-cover-full">
                    <div className="clean-cover-image-placeholder" />
                  </div>
                )}
                {style.id === 'third' && (
                  <div className="clean-cover-third">
                    <div className="clean-cover-image-placeholder" />
                  </div>
                )}
                {style.id === 'none' && (
                  <div className="clean-cover-none">
                    <div className="clean-cover-text-placeholder" />
                  </div>
                )}
              </div>
              <span className="clean-cover-label">{style.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// Theme Section
function ThemeSection({ event }: { event: EventRow }) {
  // Read initial theme from event metadata
  const getInitialTheme = (): ThemeName => {
    const metadata = event.metadata as Record<string, unknown> | null;
    if (metadata && typeof metadata.themeName === 'string') {
      const theme = metadata.themeName as string;
      if (theme === 'echo' || theme === 'spring' || theme === 'lark' || theme === 'sage') {
        return theme;
      }
    }
    return 'echo'; // default
  };

  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(getInitialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const themes: { id: ThemeName; label: string; image: string }[] = [
    { id: 'echo', label: 'Echo', image: '/assets/themes/echo.jpg' },
    { id: 'spring', label: 'Spring', image: '/assets/themes/spring.jpg' },
    { id: 'lark', label: 'Lark', image: '/assets/themes/lark.jpg' },
    { id: 'sage', label: 'Sage', image: '/assets/themes/sage.jpg' },
  ];

  const handleThemeChange = async (themeId: ThemeName) => {
    if (themeId === selectedTheme || isSaving) return;

    setSelectedTheme(themeId);
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const currentMetadata = (event.metadata as Record<string, unknown>) || {};
      const newMetadata = {
        ...currentMetadata,
        themeName: themeId,
      };

      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: newMetadata }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setSaveMessage({ type: 'success', text: 'Theme saved' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save' });
      setSelectedTheme(getInitialTheme());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="clean-settings-title">Theme</h2>
        {saveMessage && (
          <span className={cn(
            'text-sm',
            saveMessage.type === 'success' ? 'text-teal-600' : 'text-red-500'
          )}>
            {saveMessage.text}
          </span>
        )}
        {isSaving && (
          <span className="text-sm text-gray-400">Saving...</span>
        )}
      </div>
      <p className="text-gray-500 mb-6">
        Each cover theme offers a unique font and layout giving your cover photo an amazing first impression.
      </p>

      <div className="clean-theme-grid">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            disabled={isSaving}
            className={cn(
              'clean-theme-option',
              selectedTheme === theme.id && 'clean-theme-option--selected',
              isSaving && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="clean-theme-preview">
              <div className="clean-theme-image">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
              <div className="clean-theme-overlay">
                <span className="clean-theme-title-preview">{theme.label}</span>
              </div>
            </div>
            <span className="clean-theme-label">{theme.label}</span>
          </button>
        ))}
      </div>

      <div className="clean-design-accordion">
        <button className="clean-accordion-trigger">
          <span>Photos Layout & Color</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        <button className="clean-accordion-trigger">
          <span>App Icon</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

// Layout Section
function LayoutSection() {
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [gridGap, setGridGap] = useState<'none' | 'small' | 'medium'>('small');

  return (
    <>
      <h2 className="clean-settings-title">Photos Layout & Color</h2>

      <div className="clean-settings-form">
        <SettingsField label="Grid Size" description="Choose the size of photo thumbnails.">
          <div className="clean-button-group">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={cn(
                  'clean-button-option',
                  gridSize === size && 'clean-button-option--selected'
                )}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </SettingsField>

        <SettingsField label="Grid Gap" description="Set the spacing between photos.">
          <div className="clean-button-group">
            {(['none', 'small', 'medium'] as const).map((gap) => (
              <button
                key={gap}
                onClick={() => setGridGap(gap)}
                className={cn(
                  'clean-button-option',
                  gridGap === gap && 'clean-button-option--selected'
                )}
              >
                {gap.charAt(0).toUpperCase() + gap.slice(1)}
              </button>
            ))}
          </div>
        </SettingsField>

        <SettingsField label="Background Color" description="Set the gallery background color.">
          <div className="clean-color-picker">
            <div className="clean-color-preview" style={{ backgroundColor: '#ffffff' }} />
            <input
              type="text"
              className="clean-input"
              defaultValue="#ffffff"
              placeholder="#ffffff"
            />
          </div>
        </SettingsField>

        <SettingsToggle
          label="Show Photo Numbers"
          description="Display photo numbers in the gallery grid."
          defaultChecked={false}
        />

        <SettingsToggle
          label="Lazy Loading"
          description="Load photos as visitors scroll for better performance."
          defaultChecked={true}
        />
      </div>
    </>
  );
}

// App Settings Section
function AppSettingsSection({ event }: { event: EventRow }) {
  const [ctaEnabled, setCtaEnabled] = useState(true);

  return (
    <>
      <h2 className="clean-settings-title">App Settings</h2>

      <div className="clean-settings-form">
        <SettingsField
          label="App Name"
          description="The name displayed in the mobile gallery app."
        >
          <input
            type="text"
            className="clean-input"
            defaultValue={event.name ?? 'Sample Gallery App'}
            placeholder="Gallery Name"
          />
        </SettingsField>

        <SettingsField
          label="Event Date"
          description="The date displayed on the gallery cover."
        >
          <input
            type="date"
            className="clean-input"
            defaultValue={event.date ?? ''}
          />
        </SettingsField>

        <div className="clean-settings-field">
          <label className="clean-settings-field-label">Status</label>
          <SettingsToggle
            label="Published"
            description="You can take the gallery app online/offline quickly. Unpublished gallery apps can only be seen by you."
            defaultChecked={true}
          />
        </div>

        <div className="clean-settings-field">
          <label className="clean-settings-field-label">Call to Action Button</label>
          <div className="clean-toggle-row mb-3">
            <button
              onClick={() => setCtaEnabled(!ctaEnabled)}
              className={cn('clean-toggle', ctaEnabled && 'clean-toggle--active')}
            >
              <span className="clean-toggle-knob" />
            </button>
            <span className="clean-toggle-label">{ctaEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <p className="clean-settings-field-desc mb-4">
            Add a call-to-action button to the end of the photo section to bring your clients to other pages like the full gallery, your website or blog.
          </p>

          {ctaEnabled && (
            <div className="clean-cta-fields">
              <SettingsField label="Button Label">
                <input
                  type="text"
                  className="clean-input"
                  defaultValue="Visit Website"
                  placeholder="Button text"
                />
              </SettingsField>

              <SettingsField label="Link URL">
                <input
                  type="url"
                  className="clean-input"
                  defaultValue="https://example.com/"
                  placeholder="https://..."
                />
              </SettingsField>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Activity View (Main Content)
function ActivityView() {
  return (
    <div className="clean-activity-view">
      <h2 className="clean-settings-title">Recent Activity</h2>
      <div className="clean-activity-empty">
        <Activity className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">No recent activity</p>
        <p className="text-sm text-gray-400 mt-2">
          Views, downloads, and purchases will appear here
        </p>
      </div>
    </div>
  );
}

// Mobile Preview Panel
function MobilePreviewPanel({
  event,
  onClose,
}: {
  event: EventRow;
  onClose: () => void;
}) {
  const eventName = event.name ?? 'Sample Gallery App';
  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).toUpperCase()
    : 'DATE';

  return (
    <aside className="clean-mobile-preview-panel">
      <div className="clean-mobile-preview-header">
        <button onClick={onClose} className="clean-back-link">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="clean-device-toggle">
          <button className="clean-device-btn clean-device-btn--active">
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="clean-mobile-preview-content">
        <p className="clean-mobile-preview-hint">
          Scroll and click to preview your gallery app.
        </p>

        {/* Phone Frame */}
        <div className="clean-phone-frame">
          <div className="clean-phone-notch" />
          <div className="clean-phone-screen">
            {/* Cover Image Area */}
            <div className="clean-phone-cover">
              <div className="clean-phone-cover-overlay">
                <span className="clean-phone-date">{eventDate}</span>
                <h2 className="clean-phone-title">{eventName.toUpperCase()}</h2>
                <button className="clean-phone-cta">VIEW PHOTOS</button>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="clean-phone-nav">
              <button className="clean-phone-nav-item clean-phone-nav-item--active">
                <span className="clean-phone-nav-icon">🏠</span>
              </button>
              <button className="clean-phone-nav-item">
                <Heart className="w-5 h-5" />
              </button>
              <button className="clean-phone-nav-item">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="clean-phone-nav-item">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Share Modal Component
function ShareModal({
  event,
  eventDate,
  settings,
  onClose,
}: {
  event: EventRow;
  eventDate: string;
  settings?: ParsedSettings;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<'link' | 'email' | 'qr'>('link');

  // Generate the gallery URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const galleryUrl = settings?.url
    ? `${baseUrl}/gallery/${settings.url}`
    : `${baseUrl}/gallery/${event.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="clean-modal-overlay" onClick={onClose}>
      <div
        className="clean-modal clean-share-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="clean-modal-header">
          <div className="clean-modal-title-group">
            <h2 className="clean-modal-title">Share Collection</h2>
            <p className="clean-modal-subtitle">{event.name}</p>
          </div>
          <button onClick={onClose} className="clean-modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share Tabs */}
        <div className="clean-share-tabs">
          <button
            onClick={() => setActiveShareTab('link')}
            className={cn(
              'clean-share-tab',
              activeShareTab === 'link' && 'clean-share-tab--active'
            )}
          >
            <Link2 className="w-4 h-4" />
            Link
          </button>
          <button
            onClick={() => setActiveShareTab('email')}
            className={cn(
              'clean-share-tab',
              activeShareTab === 'email' && 'clean-share-tab--active'
            )}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setActiveShareTab('qr')}
            className={cn(
              'clean-share-tab',
              activeShareTab === 'qr' && 'clean-share-tab--active'
            )}
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="clean-share-content">
          {activeShareTab === 'link' && (
            <ShareLinkTab
              galleryUrl={galleryUrl}
              copied={copied}
              onCopy={handleCopyLink}
              settings={settings}
            />
          )}
          {activeShareTab === 'email' && (
            <ShareEmailTab event={event} galleryUrl={galleryUrl} />
          )}
          {activeShareTab === 'qr' && (
            <ShareQRTab event={event} galleryUrl={galleryUrl} />
          )}
        </div>

        {/* Event Info Footer */}
        <div className="clean-share-footer">
          <div className="clean-share-info">
            <div className="clean-share-info-item">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{eventDate}</span>
            </div>
            <div className="clean-share-info-item">
              <Globe className="w-4 h-4 text-gray-400" />
              <span>{settings?.password ? 'Password Protected' : 'Public Access'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Share Link Tab
function ShareLinkTab({
  galleryUrl,
  copied,
  onCopy,
  settings,
}: {
  galleryUrl: string;
  copied: boolean;
  onCopy: () => void;
  settings?: ParsedSettings;
}) {
  return (
    <div className="clean-share-link-tab">
      <div className="clean-share-link-section">
        <label className="clean-share-label">Gallery Link</label>
        <div className="clean-share-link-input-group">
          <input
            type="text"
            readOnly
            value={galleryUrl}
            className="clean-share-link-input"
          />
          <button
            onClick={onCopy}
            className={cn(
              'clean-share-copy-btn',
              copied && 'clean-share-copy-btn--copied'
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {settings?.password && (
        <div className="clean-share-password-section">
          <label className="clean-share-label">
            <Lock className="w-4 h-4 inline mr-2" />
            Password Required
          </label>
          <p className="clean-share-hint">
            Visitors will need to enter the password you set to access this gallery.
          </p>
        </div>
      )}

      <div className="clean-share-quick-actions">
        <button className="clean-share-quick-btn">
          <Users className="w-4 h-4" />
          Generate Family Tokens
        </button>
      </div>
    </div>
  );
}

// Share Email Tab
function ShareEmailTab({
  event,
  galleryUrl,
}: {
  event: EventRow;
  galleryUrl: string;
}) {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState(
    `¡Hola!\n\nLas fotos del evento "${event.name}" ya están disponibles.\n\nPuedes verlas aquí:\n${galleryUrl}\n\n¡Esperamos que las disfrutes!`
  );

  return (
    <div className="clean-share-email-tab">
      <div className="clean-share-field">
        <label className="clean-share-label">Recipients</label>
        <textarea
          placeholder="Enter email addresses, separated by commas"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className="clean-share-textarea clean-share-textarea--small"
          rows={2}
        />
      </div>

      <div className="clean-share-field">
        <label className="clean-share-label">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="clean-share-textarea"
          rows={6}
        />
      </div>

      <button className="clean-btn clean-btn--primary clean-btn--full">
        <Mail className="clean-btn-icon" />
        Send Invitation
      </button>
    </div>
  );
}

// Share QR Tab
function ShareQRTab({
  event,
  galleryUrl,
}: {
  event: EventRow;
  galleryUrl: string;
}) {
  return (
    <div className="clean-share-qr-tab">
      <div className="clean-share-qr-preview">
        {/* QR Code placeholder - in production, use a QR library */}
        <div className="clean-share-qr-placeholder">
          <QrCode className="w-24 h-24 text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">QR Code Preview</p>
        </div>
      </div>

      <div className="clean-share-qr-info">
        <p className="text-sm text-gray-600">
          Scan this QR code to access the gallery directly on any mobile device.
        </p>
      </div>

      <div className="clean-share-qr-actions">
        <button className="clean-btn clean-btn--secondary">
          <Download className="clean-btn-icon" />
          Download PNG
        </button>
        <button className="clean-btn clean-btn--secondary">
          <Download className="clean-btn-icon" />
          Download SVG
        </button>
      </div>

      <div className="clean-share-qr-url">
        <label className="clean-share-label">QR Code URL</label>
        <input
          type="text"
          readOnly
          value={galleryUrl}
          className="clean-share-link-input"
        />
      </div>
    </div>
  );
}

// =============================================================================
// PHOTO DETAIL MODAL - View and edit single photo
// =============================================================================

interface PhotoDetailModalProps {
  photo: Photo;
  photos: Photo[];
  eventId: string;
  onClose: () => void;
  onDelete: (photoId: string) => void;
  onNavigate: (photoId: string) => void;
}

function PhotoDetailModal({
  photo,
  photos,
  eventId,
  onClose,
  onDelete,
  onNavigate,
}: PhotoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'tagging'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const [taggedStudents, setTaggedStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // Find current index and adjacent photos
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  // Get photo URL
  const photoUrl = photo.preview_path
    ? getStorageUrl(photo.preview_path, 'photos')
    : photo.storage_path
    ? getStorageUrl(photo.storage_path, 'photos')
    : '';

  // Load tagged students
  useEffect(() => {
    const fetchTaggedStudents = async () => {
      setIsLoadingTags(true);
      try {
        const response = await fetch(`/api/admin/photos/${photo.id}/tags`);
        if (response.ok) {
          const data = await response.json();
          setTaggedStudents(data.students || []);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };
    fetchTaggedStudents();
  }, [photo.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && prevPhoto) {
        onNavigate(prevPhoto.id);
      } else if (e.key === 'ArrowRight' && nextPhoto) {
        onNavigate(nextPhoto.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, prevPhoto, nextPhoto]);

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta foto? Esta acción no se puede deshacer.')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onDelete(photo.id);
        onClose();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!photoUrl) return;
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = photo.original_filename || photo.filename || `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  return (
    <div className="clean-modal-overlay clean-photo-modal-overlay" onClick={onClose}>
      <div
        className="clean-photo-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Arrows */}
        {prevPhoto && (
          <button
            className="clean-photo-nav-arrow clean-photo-nav-arrow--prev"
            onClick={() => onNavigate(prevPhoto.id)}
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {nextPhoto && (
          <button
            className="clean-photo-nav-arrow clean-photo-nav-arrow--next"
            onClick={() => onNavigate(nextPhoto.id)}
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Main Content */}
        <div className="clean-photo-modal-content">
          {/* Image Area */}
          <div className="clean-photo-modal-image">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={photo.original_filename || photo.filename || 'Photo'}
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 70vw"
                priority
                unoptimized
              />
            ) : (
              <div className="clean-photo-modal-placeholder">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}

            {/* Image Counter */}
            <div className="clean-photo-modal-counter">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="clean-photo-modal-sidebar">
            {/* Header */}
            <div className="clean-photo-modal-header">
              <h3 className="clean-photo-modal-title">
                {photo.original_filename || photo.filename || 'Photo'}
              </h3>
              <button onClick={onClose} className="clean-modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="clean-photo-modal-tabs">
              <button
                className={cn(
                  'clean-photo-modal-tab',
                  activeTab === 'info' && 'clean-photo-modal-tab--active'
                )}
                onClick={() => setActiveTab('info')}
              >
                <MoreHorizontal className="w-4 h-4" />
                Info
              </button>
              <button
                className={cn(
                  'clean-photo-modal-tab',
                  activeTab === 'tagging' && 'clean-photo-modal-tab--active'
                )}
                onClick={() => setActiveTab('tagging')}
              >
                <Users className="w-4 h-4" />
                Tagging
                {taggedStudents.length > 0 && (
                  <span className="clean-photo-modal-badge">{taggedStudents.length}</span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="clean-photo-modal-body">
              {activeTab === 'info' && (
                <div className="clean-photo-info">
                  {/* Photo Details */}
                  <div className="clean-photo-info-section">
                    <h4 className="clean-photo-info-title">Details</h4>
                    <div className="clean-photo-info-grid">
                      <div className="clean-photo-info-item">
                        <span className="clean-photo-info-label">Filename</span>
                        <span className="clean-photo-info-value">
                          {photo.original_filename || photo.filename || 'Unknown'}
                        </span>
                      </div>
                      <div className="clean-photo-info-item">
                        <span className="clean-photo-info-label">Uploaded</span>
                        <span className="clean-photo-info-value">
                          {formatDate(photo.created_at)}
                        </span>
                      </div>
                      <div className="clean-photo-info-item">
                        <span className="clean-photo-info-label">Size</span>
                        <span className="clean-photo-info-value">
                          {formatFileSize((photo as unknown as { size?: number }).size)}
                        </span>
                      </div>
                      <div className="clean-photo-info-item">
                        <span className="clean-photo-info-label">Status</span>
                        <span className="clean-photo-info-value">
                          <span className={cn(
                            'clean-photo-status',
                            taggedStudents.length > 0 ? 'clean-photo-status--tagged' : 'clean-photo-status--untagged'
                          )}>
                            {taggedStudents.length > 0 ? 'Tagged' : 'Untagged'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tagged Students Preview */}
                  {taggedStudents.length > 0 && (
                    <div className="clean-photo-info-section">
                      <h4 className="clean-photo-info-title">Tagged Students</h4>
                      <div className="clean-photo-tags-preview">
                        {taggedStudents.slice(0, 3).map((student) => (
                          <span key={student.id} className="clean-photo-tag">
                            {student.name}
                          </span>
                        ))}
                        {taggedStudents.length > 3 && (
                          <span className="clean-photo-tag clean-photo-tag--more">
                            +{taggedStudents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tagging' && (
                <PhotoTaggingPanel
                  photoId={photo.id}
                  eventId={eventId}
                  taggedStudents={taggedStudents}
                  isLoading={isLoadingTags}
                  onTagsUpdate={setTaggedStudents}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="clean-photo-modal-footer">
              <button
                className="clean-btn clean-btn--secondary"
                onClick={handleDownload}
                disabled={!photoUrl}
              >
                <Download className="clean-btn-icon" />
                Download
              </button>
              <button
                className="clean-btn clean-btn--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <X className="clean-btn-icon" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PHOTO TAGGING PANEL - Tag students to photos
// =============================================================================

interface PhotoTaggingPanelProps {
  photoId: string;
  eventId: string;
  taggedStudents: Array<{ id: string; name: string }>;
  isLoading: boolean;
  onTagsUpdate: (students: Array<{ id: string; name: string }>) => void;
}

function PhotoTaggingPanel({
  photoId,
  eventId,
  taggedStudents,
  isLoading,
  onTagsUpdate,
}: PhotoTaggingPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Search students
  useEffect(() => {
    const searchStudents = async () => {
      if (searchQuery.length < 2) {
        setAvailableStudents([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/students/search?q=${encodeURIComponent(searchQuery)}&eventId=${eventId}`
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out already tagged students
          const taggedIds = new Set(taggedStudents.map((s) => s.id));
          setAvailableStudents((data.students || []).filter((s: { id: string }) => !taggedIds.has(s.id)));
        }
      } catch (error) {
        console.error('Failed to search students:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, eventId, taggedStudents]);

  // Add tag
  const handleAddTag = async (student: { id: string; name: string }) => {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id }),
      });
      if (response.ok) {
        onTagsUpdate([...taggedStudents, student]);
        setSearchQuery('');
        setAvailableStudents([]);
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  // Remove tag
  const handleRemoveTag = async (studentId: string) => {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/tags/${studentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onTagsUpdate(taggedStudents.filter((s) => s.id !== studentId));
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="clean-photo-tagging-loading">
        <div className="clean-spinner" />
        <p>Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="clean-photo-tagging">
      {/* Search Input */}
      <div className="clean-photo-tagging-search">
        <div className="clean-search-input-wrapper">
          <Users className="clean-search-input-icon" />
          <input
            type="text"
            className="clean-input clean-search-input"
            placeholder="Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && <div className="clean-spinner clean-spinner--small" />}
        </div>

        <button
          className="clean-btn clean-btn--secondary clean-btn--icon"
          onClick={() => setShowQRScanner(!showQRScanner)}
          title="Scan QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Search Results */}
      {availableStudents.length > 0 && (
        <div className="clean-photo-tagging-results">
          {availableStudents.map((student) => (
            <button
              key={student.id}
              className="clean-photo-tagging-result"
              onClick={() => handleAddTag(student)}
            >
              <Users className="w-4 h-4" />
              <span>{student.name}</span>
              <Plus className="w-4 h-4 ml-auto" />
            </button>
          ))}
        </div>
      )}

      {/* QR Scanner Placeholder */}
      {showQRScanner && (
        <div className="clean-photo-qr-scanner">
          <div className="clean-photo-qr-scanner-placeholder">
            <QrCode className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500 mt-2">QR Scanner</p>
            <p className="text-xs text-gray-400">Point camera at student QR code</p>
          </div>
        </div>
      )}

      {/* Tagged Students */}
      <div className="clean-photo-tagging-tags">
        <h4 className="clean-photo-info-title">
          Tagged Students ({taggedStudents.length})
        </h4>
        {taggedStudents.length === 0 ? (
          <p className="clean-photo-tagging-empty">
            No students tagged yet. Search above to add tags.
          </p>
        ) : (
          <div className="clean-photo-tags-list">
            {taggedStudents.map((student) => (
              <div key={student.id} className="clean-photo-tag-item">
                <Users className="w-4 h-4" />
                <span>{student.name}</span>
                <button
                  className="clean-photo-tag-remove"
                  onClick={() => handleRemoveTag(student.id)}
                  aria-label={`Remove ${student.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get navigation icon
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
