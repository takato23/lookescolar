"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderIcon, 
  FolderOpenIcon, 
  ImageIcon, 
  UploadIcon, 
  DownloadIcon, 
  TrashIcon, 
  GridIcon, 
  ListIcon, 
  CheckIcon, 
  XIcon,
  SearchIcon,
  FilterIcon,
  MoreVerticalIcon,
  StarIcon,
  ShareIcon,
  CopyIcon,
  MoveIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

// Types (adapted from provided code)
interface PhotoItem {
  id: string;
  name: string;
  type: 'photo' | 'video';
  src: string;
  thumbnail?: string;
  size: number;
  dateAdded: Date;
  tags: string[];
  favorite: boolean;
  folderId?: string;
}

interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  itemCount: number;
  dateCreated: Date;
}

interface PhotoManagementProps {
  initialPhotos?: PhotoItem[];
  initialFolders?: FolderItem[];
}

interface UploadQueueItem {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

// Folder Tree Component
const FolderTree: React.FC<{
  folders: FolderItem[];
  selectedFolder?: string;
  onFolderSelect: (folderId: string | undefined) => void;
  onCreateFolder: () => void;
}> = ({ folders, selectedFolder, onFolderSelect, onCreateFolder }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-medium">Folders</h3>
        <Button variant="ghost" size="sm" onClick={onCreateFolder}>
          <FolderIcon className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2 space-y-1">
          <Button
            variant={selectedFolder === undefined ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onFolderSelect(undefined)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            All Photos
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={selectedFolder === folder.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onFolderSelect(folder.id)}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              <span className="truncate">{folder.name}</span>
              <Badge variant="outline" className="ml-auto">
                {folder.itemCount}
              </Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Photo Grid Item Component
const PhotoGridItem: React.FC<{
  photo: PhotoItem;
  isSelected: boolean;
  onSelect: (photo: PhotoItem) => void;
  onToggleSelect: (photo: PhotoItem) => void;
  isDragOver: boolean;
  onDragStart: (photo: PhotoItem) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPhoto: PhotoItem) => void;
}> = ({ 
  photo, 
  isSelected, 
  onSelect, 
  onToggleSelect, 
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "relative group cursor-default hover:cursor-grab active:cursor-grabbing rounded-lg overflow-hidden border-2 transition-all",
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-gray-300",
        isDragOver && "border-blue-400 bg-blue-50"
      )}
      draggable
      onDragStart={() => onDragStart(photo)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, photo)}
      onClick={() => onSelect(photo)}
    >
      <div className="aspect-square relative">
        <img
          src={photo.src}
          alt={photo.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {photo.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-4 border-l-black border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1" />
            </div>
          </div>
        )}
        
        {/* Selection checkbox */}
        <div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-default z-20"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(photo)}
            className="bg-white cursor-pointer shadow-sm rounded-md h-5 w-5"
            onClick={(e) => e.stopPropagation()}
            aria-label="Seleccionar foto"
          />
        </div>

        {/* Favorite star */}
        {photo.favorite && (
          <div className="absolute top-2 right-2">
            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
          </div>
        )}

        {/* Actions menu */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-6 w-6 p-0">
                <MoreVerticalIcon className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyIcon className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MoveIcon className="h-4 w-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Photo info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{photo.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(photo.size)}</p>
        {photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {photo.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {photo.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{photo.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Component
const PhotoManagement: React.FC<PhotoManagementProps> = ({
  initialPhotos = [],
  initialFolders = [],
  className
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedPhoto, setDraggedPhoto] = useState<PhotoItem | null>(null);
  const [dragOverPhoto, setDragOverPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Filter photos based on selected folder and search
  const filteredPhotos = useMemo(() => {
    let filtered = photos;
    
    if (selectedFolder) {
      filtered = filtered.filter(photo => photo.folderId === selectedFolder);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(photo => 
        photo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [photos, selectedFolder, searchQuery]);

  // Handle photo selection
  const handlePhotoSelect = useCallback((photo: PhotoItem) => {
    const newSelection = new Set([photo.id]);
    setSelectedPhotos(newSelection);
    // onPhotoSelect?.([photo]); // This prop is not passed to this component
  }, []);

  const handlePhotoToggleSelect = useCallback((photo: PhotoItem) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photo.id)) {
      newSelection.delete(photo.id);
    } else {
      newSelection.add(photo.id);
    }
    setSelectedPhotos(newSelection);
    
    // const selectedPhotoItems = photos.filter(p => newSelection.has(p.id)); // This prop is not passed to this component
    // onPhotoSelect?.(selectedPhotoItems);
  }, [selectedPhotos, photos]);

  // Handle folder selection
  const handleFolderSelect = useCallback((folderId: string | undefined) => {
    setSelectedFolder(folderId);
    // const folder = folders.find(f => f.id === folderId); // This prop is not passed to this component
    // if (folder) {
    //   onFolderSelect?.(folder);
    // }
  }, [folders]);

  // Handle drag and drop
  const handleDragStart = useCallback((photo: PhotoItem) => {
    setDraggedPhoto(photo);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetPhoto: PhotoItem) => {
    e.preventDefault();
    if (draggedPhoto && draggedPhoto.id !== targetPhoto.id) {
      // Reorder photos logic would go here
      console.log(`Moving ${draggedPhoto.name} near ${targetPhoto.name}`);
    }
    setDraggedPhoto(null);
    setDragOverPhoto(null);
  }, [draggedPhoto]);

  // Modified handleFileUpload
  const handleFileUpload = useCallback((files: FileList) => {
    const newQueueItems = Array.from(files).map(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        return new Promise<UploadQueueItem>(resolve => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file,
              preview: e.target?.result as string,
              status: 'pending'
            });
          };
          reader.readAsDataURL(file);
        });
      }
      return null;
    }).filter(Boolean);

    Promise.all(newQueueItems).then(items => {
      setUploadQueue(prev => [...prev, ...items]);
    });
  }, []);

  const handleUploadQueue = async () => {
    if (uploadQueue.length === 0) return;

    setUploadQueue(prev => prev.map(item => 
      item.status === 'pending' ? { ...item, status: 'uploading' } : item
    ));

    const formData = new FormData();
    const pendingFiles = uploadQueue.filter(item => item.status === 'uploading');
    pendingFiles.forEach(item => {
      formData.append('files', item.file);
    });

    try {
      const response = await fetch('/api/admin/photos/simple-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadQueue(prev => prev.map(item => 
          item.status === 'uploading' ? { ...item, status: 'done' } : item
        ));
        // Trigger refresh of photos from server
        // Assuming there's a prop or context to refresh, or call loadPhotos externally
        toast.success(`${data.successful} photos uploaded`);
        setTimeout(() => {
          setUploadQueue([]);
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Upload failed');
      setUploadQueue(prev => prev.map(item => 
        item.status === 'uploading' ? { ...item, status: 'error' } : item
      ));
    }
  };

  // Handle bulk actions
  const handleBulkDelete = useCallback(() => {
    setPhotos(prev => prev.filter(photo => !selectedPhotos.has(photo.id)));
    setSelectedPhotos(new Set());
  }, [selectedPhotos]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredPhotos.map(photo => photo.id));
    setSelectedPhotos(allIds);
  }, [filteredPhotos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30">
        <FolderTree
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onCreateFolder={() => {
            const newFolder: FolderItem = {
              id: `folder-${Date.now()}`,
              name: `New Folder ${folders.length + 1}`,
              children: [],
              itemCount: 0,
              dateCreated: new Date()
            };
            setFolders(prev => [...prev, newFolder]);
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Photo Management</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <FilterIcon className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Selection actions */}
          {selectedPhotos.size > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
              </span>
              <Separator orientation="vertical" className="h-4" />
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                <XIcon className="h-4 w-4 mr-2" />
                Deselect
              </Button>
              <Button variant="ghost" size="sm">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm">
                <MoveIcon className="h-4 w-4 mr-2" />
                Move
              </Button>
              <Button variant="ghost" size="sm" onClick={handleBulkDelete}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Photo Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No photos found</p>
                <p className="text-sm">Upload some photos to get started</p>
              </div>
            ) : (
              <div className={cn(
                viewMode === "grid" 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  : "space-y-2"
              )}>
                <AnimatePresence>
                  {filteredPhotos.map((photo) => (
                    <PhotoGridItem
                      key={photo.id}
                      photo={photo}
                      isSelected={selectedPhotos.has(photo.id)}
                      onSelect={handlePhotoSelect}
                      onToggleSelect={handlePhotoToggleSelect}
                      isDragOver={dragOverPhoto === photo.id}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Upload Queue Section */}
        {uploadQueue.length > 0 && (
          <Card className="m-4 p-4 shadow-xl rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-100">Photos Ready to Upload ({uploadQueue.length})</h3>
              <Button 
                onClick={handleUploadQueue} 
                disabled={uploadQueue.every(item => item.status !== 'pending')} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
              >
                <UploadIcon className="h-5 w-5 mr-2" />
                Upload All Now
              </Button>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {uploadQueue.map((item, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <img src={item.preview} alt="preview" className="object-cover w-full h-full" />
                  <Badge className={`absolute top-2 right-2 px-2 py-1 rounded-md text-sm font-medium 
                    ${item.status === 'done' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="border-t p-4 bg-muted/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredPhotos.length} photos</span>
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-4">
                <Button variant="link" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="link" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoManagement;

