'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    X,
    Upload,
    FolderPlus,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PremiumProgressBar } from '@/components/admin/dashboard/StatsCardPremium';

// Helper types for our internal structure
interface PendingFolder {
    path: string;
    name: string;
    files: File[];
    depth: number;
    status: 'pending' | 'creating' | 'uploading' | 'completed' | 'error';
    folderId?: string; // Assigned after creation
    uploadProgress: number;
    error?: string;
    subfolders: PendingFolder[];
}

interface BulkGalleryCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onComplete?: () => void;
    initialFiles?: File[];
}

export function BulkGalleryCreator({
    isOpen,
    onClose,
    eventId,
    onComplete,
    initialFiles,
}: BulkGalleryCreatorProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>(
        'upload'
    );
    const [rootFolders, setRootFolders] = useState<PendingFolder[]>([]);
    const [totalFiles, setTotalFiles] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);

    const progressValue =
        totalFiles > 0 ? Math.min(100, (processedCount / totalFiles) * 100) : 0;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- File Parsing Logic ---

    const FALLBACK_ROOT = 'Subida rápida';

    const parseFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;

        // We structure folders based on their webkitRelativePath
        // Example: "Class A/Student 1/photo.jpg" -> Root: "Class A", Sub: "Student 1"

        // Map of path to folder object
        const folderMap = new Map<string, PendingFolder>();

        // Helper to get or create folder
        const getOrCreateFolder = (path: string, depth: number): PendingFolder => {
            if (folderMap.has(path)) return folderMap.get(path)!;

            const name = path.split('/').pop() || path;
            const newFolder: PendingFolder = {
                path,
                name,
                files: [],
                depth,
                status: 'pending',
                uploadProgress: 0,
                subfolders: []
            };
            folderMap.set(path, newFolder);
            return newFolder;
        };

        let fileCount = 0;

        files.forEach(file => {
            // Ignore hidden files (starting with .)
            if (file.name.startsWith('.')) return;

            const fallbackPath = `${FALLBACK_ROOT}/${file.name}`;
            const relativePath =
                file.webkitRelativePath ||
                (file as File & { path?: string }).path ||
                fallbackPath;

            const parts = relativePath.split('/');
            // Filename is the last part
            const filename = parts.pop();
            if (!filename || filename.startsWith('.')) return; // double check

            if (!file.type.startsWith('image/')) return;

            fileCount++;

            // Current directory path is the join of remaining parts
            const dirPath = parts.join('/');

            // We need to ensure the folder hierarchy exists
            // e.g. "Root/Sub" -> Ensure "Root" exists, then "Root/Sub"
            let currentPath = "";
            let parentFolder: PendingFolder | null = null;
            let depth = 0;

            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const folder = getOrCreateFolder(currentPath, depth);

                if (parentFolder) {
                    // Check if already linked
                    if (!parentFolder.subfolders.includes(folder)) {
                        parentFolder.subfolders.push(folder);
                    }
                }

                parentFolder = folder;
                depth++;
            }

            // Add file to the leaf folder
            if (parentFolder) {
                parentFolder.files.push(file);
            }
        });

        // Extract top-level folders (depth 0)
        const roots = Array.from(folderMap.values()).filter(f => f.depth === 0);

        setRootFolders(roots);
        setTotalFiles(fileCount);
        setProcessedCount(0);
        setStep('preview');
    }, []);

    const handleFileSelection = useCallback(
        (fileList: FileList) => {
            parseFiles(Array.from(fileList));
        },
        [parseFiles]
    );

    const reset = useCallback(() => {
        setStep('upload');
        setRootFolders([]);
        setTotalFiles(0);
        setProcessedCount(0);
    }, []);

    const lastInitialFilesRef = useRef<File[] | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (!initialFiles || initialFiles.length === 0) return;
        if (lastInitialFilesRef.current === initialFiles) return;

        lastInitialFilesRef.current = initialFiles;
        parseFiles(initialFiles);
    }, [isOpen, initialFiles, parseFiles]);

    useEffect(() => {
        if (isOpen) return;
        lastInitialFilesRef.current = null;
        reset();
    }, [isOpen, reset]);

    // --- Processing Logic ---

    const processQueue = async () => {
        setStep('processing');

        // Helper to process recursively
        // We process breadth-first or depth-first? 
        // Usually depth-first ensures parent exists so we can link children if API supports it.
        // However, our current API just needs 'parentId'. So parent must be created first.

        const createFolder = async (folder: PendingFolder, parentId: string | null = null) => {
            try {
                // Update status to creating
                updateFolderStatus(folder.path, 'creating');

                // 1. Create Folder in Backend
                const res = await fetch(`/api/admin/events/${eventId}/folders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: folder.name,
                        parentId: parentId
                    })
                });

                if (!res.ok) throw new Error('Failed to create folder');

                const data = await res.json();
                const createdFolderId = data.folder.id;

                // Link local object
                folder.folderId = createdFolderId;

                // 2. Upload Files
                if (folder.files.length > 0) {
                    updateFolderStatus(folder.path, 'uploading');
                    await uploadFilesToFolder(folder.files, createdFolderId, folder.path);
                }

                // 3. Process Subfolders recursively
                for (const sub of folder.subfolders) {
                    await createFolder(sub, createdFolderId);
                }

                updateFolderStatus(folder.path, 'completed');

            } catch (error) {
                console.error(error);
                updateFolderStatus(folder.path, 'error', error instanceof Error ? error.message : "Unknown error");
            }
        };

        // Helper to upload files
        const uploadFilesToFolder = async (files: File[], folderId: string, folderPath: string) => {
            // Upload in batches of 3
            const BATCH_SIZE = 3;
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);
                const formData = new FormData();
                formData.append('folder_id', folderId);
                batch.forEach(f => formData.append('files', f));

                try {
                    const res = await fetch('/api/admin/assets/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error("Upload failed");

                    // Update progress
                    setProcessedCount(prev => prev + batch.length);

                } catch (e) {
                    console.error("Batch upload failed", e);
                    // We don't mark folder as error if just some files fail, but ideally we track it
                }
            }
        };

        // Helper to update specific folder in tree state
        // Note: State update deep in tree might be tricky with React State.
        // For simplicity, we might just mutate the ref/object since deep clone is expensive,
        // provided we trigger a re-render.
        const updateFolderStatus = (path: string, status: PendingFolder['status'], error?: string) => {
            setRootFolders(prev => {
                // Clone deeply or use a recursive finder
                // Since we need performance, we'll try to find it in the existing structure
                // However, React needs new reference to trigger render.
                // Simplified approach: Re-clone whole tree is too slow for big trees.
                // Efficient approach: Use Immer or similar. 
                // Here: Manual shallow copy path or force update.
                const newRoots = [...prev];

                const findAndUpdate = (list: PendingFolder[]) => {
                    for (const f of list) {
                        if (f.path === path) {
                            f.status = status;
                            if (error) f.error = error;
                            return true;
                        }
                        if (findAndUpdate(f.subfolders)) return true;
                    }
                    return false;
                };

                findAndUpdate(newRoots);
                return newRoots;
            });
        };


        // Start processing roots
        for (const root of rootFolders) {
            await createFolder(root, null);
        }

        setStep('done');
        if (onComplete) onComplete();
    };

    // --- Render Helpers ---

    const renderFolderPreview = (folder: PendingFolder) => {
        return (
            <div key={folder.path} className="ml-4 border-l pl-2 mt-2">
                <div className="flex items-center gap-2 text-sm">
                    {folder.status === 'pending' && <FolderPlus className="w-4 h-4 text-slate-400" />}
                    {folder.status === 'creating' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    {folder.status === 'uploading' && <Upload className="w-4 h-4 animate-bounce text-blue-500" />}
                    {folder.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {folder.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

                    <span className="font-medium">{folder.name}</span>
                    <span className="text-xs text-slate-500">({folder.files.length} fotos)</span>
                </div>
                {folder.subfolders.map(renderFolderPreview)}
            </div>
        )
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Creación Masiva de Galerías</DialogTitle>
                    <DialogDescription>
                        Sube una estructura de carpetas para crear galerías automáticamente.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="py-8">
                        <div
                            className="liquid-glass group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/40 p-12 text-center transition-all hover:border-white/60 hover:bg-white/30 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-slate-900/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <FolderPlus className="relative mb-4 h-16 w-16 text-slate-300" />
                            <h3 className="relative mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Cargar carpetas
                            </h3>
                            <p className="relative max-w-sm text-sm text-slate-500 dark:text-slate-400">
                                Selecciona o arrastra una carpeta principal que contenga subcarpetas.
                                Cada carpeta se convertirá en una galería.
                            </p>
                            <Button variant="outline" className="relative mt-6">
                                Seleccionar Estructura
                            </Button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                // @ts-ignore - webkitdirectory is standard in modern browsers but missing in React types
                                webkitdirectory=""
                                directory=""
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                    e.target.files && handleFileSelection(e.target.files)
                                }
                            />
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Se crearán <strong>{rootFolders.length}</strong> galerías principales y se subirán <strong>{totalFiles}</strong> fotos.
                            </div>
                        </div>

                        <ScrollArea className="liquid-glass h-[300px] rounded-2xl border border-white/30 p-4 dark:border-white/10">
                            <div className="-ml-4">
                                {rootFolders.map(renderFolderPreview)}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="py-8 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                                <span>Procesando...</span>
                                <span>{Math.round(progressValue)}%</span>
                            </div>
                            <PremiumProgressBar
                                value={progressValue}
                                variant="blue"
                                className="h-2"
                                trackClassName="bg-white/60 dark:bg-slate-800/60"
                                barClassName="shadow-[0_0_14px_rgba(59,130,246,0.4)]"
                            />
                        </div>

                        <ScrollArea className="liquid-glass h-[200px] rounded-2xl border border-white/30 p-4 dark:border-white/10">
                            <div className="-ml-4">
                                {rootFolders.map(renderFolderPreview)}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {step === 'done' && (
                    <div className="py-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">¡Proceso Completado!</h3>
                        <p className="text-slate-500">
                            Se han creado las galerías y subido las fotos correctamente.
                        </p>
                    </div>
                )}

                <DialogFooter className="border-t border-white/10 pt-4 dark:border-white/5">
                    {step === 'upload' && (
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="ghost" onClick={reset}>Volver</Button>
                            <Button onClick={processQueue}>Iniciar Creación</Button>
                        </>
                    )}
                    {step === 'done' && (
                        <Button onClick={onClose}>Cerrar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
