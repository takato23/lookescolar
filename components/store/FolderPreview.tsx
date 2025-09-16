'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Package,
  Image,
  Users,
  Camera,
  Eye,
  Sparkles,
  Star,
  Heart,
  Sun,
  Cloud,
  Rocket,
} from 'lucide-react';
import { ProductOption } from '@/lib/types/unified-store';

interface FolderPreviewProps {
  selectedPackage: ProductOption | null;
  selectedIndividualPhotos: Array<{ id: string; url: string }>;
  selectedGroupPhoto?: { id: string; url: string };
  className?: string;
}

export function FolderPreview({
  selectedPackage,
  selectedIndividualPhotos,
  selectedGroupPhoto,
  className,
}: FolderPreviewProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!selectedPackage) return null;

  const isComplete = 
    selectedIndividualPhotos.length === selectedPackage.contents.individualPhotos &&
    (selectedPackage.contents.groupPhotos === 0 || !!selectedGroupPhoto);

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Vista Previa de tu Carpeta</h3>
            </div>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {isComplete ? "Completa" : "En Progreso"}
            </Badge>
          </div>

          {/* Compact Folder Visualization */}
          <div className="relative">
            {/* Folder Background */}
            <div className="relative rounded-xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-4">
              
              {/* Decorative Elements */}
              <div className="absolute inset-0 overflow-hidden opacity-30">
                <Sun className="absolute top-4 left-4 h-8 w-8 text-yellow-400" />
                <Cloud className="absolute top-8 right-8 h-6 w-6 text-blue-300" />
                <Cloud className="absolute top-16 right-20 h-5 w-5 text-blue-300" />
                <Rocket className="absolute bottom-8 left-8 h-10 w-10 text-purple-400 rotate-45" />
                <Heart className="absolute bottom-12 right-12 h-5 w-5 text-pink-400" />
                <Star className="absolute top-20 left-20 h-6 w-6 text-yellow-400" />
                <Sparkles className="absolute bottom-20 right-20 h-6 w-6 text-purple-400" />
              </div>

              {/* Photo Layout */}
              <div className="relative z-10 space-y-4">
                {/* Folder Title */}
                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {selectedPackage.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Carpeta de {selectedPackage.contents.folderSize}</p>
                </div>

                {/* Individual Photos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Camera className="h-4 w-4" />
                    <span>Fotos Individuales ({selectedIndividualPhotos.length}/{selectedPackage.contents.individualPhotos})</span>
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: selectedPackage.contents.individualPhotos }).map((_, index) => {
                      const photo = selectedIndividualPhotos[index];
                      return (
                        <div
                          key={index}
                          className={cn(
                            "w-20 h-24 rounded-lg overflow-hidden flex-shrink-0",
                            photo 
                              ? "bg-white dark:bg-gray-800 shadow-md" 
                              : "bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600"
                          )}
                        >
                          {photo ? (
                            <img 
                              src={photo.url} 
                              alt={`Individual ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <Image className="h-4 w-4 text-gray-400 mx-auto" />
                                <span className="text-[10px] text-gray-500">Ind. {index + 1}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Small Photos (4x5) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Camera className="h-4 w-4" />
                    <span>{selectedPackage.contents.smallPhotos} Fotitos ({selectedPackage.contents.smallSize})</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: selectedPackage.contents.smallPhotos }).map((_, index) => {
                      // Use the first individual photo for all small photos
                      const photo = selectedIndividualPhotos[0];
                      return (
                        <div
                          key={index}
                          className={cn(
                            "w-10 h-12 rounded overflow-hidden",
                            photo 
                              ? "bg-white dark:bg-gray-800 shadow-sm" 
                              : "bg-gray-200 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600"
                          )}
                        >
                          {photo ? (
                            <img 
                              src={photo.url} 
                              alt={`Small ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Camera className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group Photo */}
                {selectedPackage.contents.groupPhotos > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>Foto Grupal ({selectedGroupPhoto ? '1/1' : '0/1'})</span>
                    </div>
                    <div
                      className={cn(
                        "h-20 rounded-lg overflow-hidden",
                        selectedGroupPhoto 
                          ? "bg-white dark:bg-gray-800 shadow-md" 
                          : "bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600"
                      )}
                    >
                      {selectedGroupPhoto ? (
                        <img 
                          src={selectedGroupPhoto.url} 
                          alt="Foto Grupal"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Users className="h-5 w-5 text-gray-400 mx-auto" />
                            <span className="text-xs text-gray-500">Foto Grupal</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View Full Preview Button */}
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowFullPreview(true)}
              disabled={!isComplete}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Vista Completa
            </Button>
          </div>
        </div>
      </Card>

      {/* Full Preview Modal */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Completa de tu Carpeta - {selectedPackage.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 p-4">
            {/* Cover Page */}
            <div className="rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 p-8 text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Mi Álbum Escolar
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400">Recuerdos que duran para siempre</p>
              <div className="mt-6 flex justify-center gap-4">
                <Star className="h-8 w-8 text-yellow-400" />
                <Heart className="h-8 w-8 text-pink-400" />
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            {/* Individual Photos Page */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Mis Fotos Individuales</h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedIndividualPhotos.map((photo, index) => (
                  <div key={index} className="aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={photo.url} 
                      alt={`Individual ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Small Photos Page */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Fotitos para Compartir</h3>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: selectedPackage.contents.smallPhotos }).map((_, index) => {
                  const photo = selectedIndividualPhotos[Math.floor(index / 4)];
                  return (
                    <div key={index} className="aspect-[4/5] rounded overflow-hidden shadow">
                      {photo && (
                        <img 
                          src={photo.url} 
                          alt={`Small ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group Photo Page */}
            {selectedGroupPhoto && (
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Nuestra Foto Grupal</h3>
                <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={selectedGroupPhoto.url} 
                    alt="Foto Grupal"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}