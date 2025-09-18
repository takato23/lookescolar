'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Camera,
  Calendar,
  Download,
  ShoppingCart,
  Eye,
  Heart,
  Share2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GroupPhoto {
  id: string;
  filename: string;
  storage_path: string;
  signed_url: string;
  photo_type: 'group' | 'activity' | 'event';
  is_group_photo: boolean;
  course_id: string;
  tagged_at: string;
  created_at: string;
  association_id: string;
}

interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
}

interface GroupPhotosSectionProps {
  token: string;
  course?: Course;
}

export default function GroupPhotosSection({
  token,
  course,
}: GroupPhotosSectionProps) {
  const [groupPhotos, setGroupPhotos] = useState<GroupPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<
    'all' | 'group' | 'activity' | 'event'
  >('all');
  const [selectedPhoto, setSelectedPhoto] = useState<GroupPhoto | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Load group photos
  const loadGroupPhotos = async () => {
    if (!course) return;

    setLoading(true);
    try {
      const photoTypeParam =
        selectedPhotoType !== 'all' ? `?photo_type=${selectedPhotoType}` : '';
      const response = await fetch(
        `/api/family/gallery/${token}/group-photos${photoTypeParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to load group photos');
      }

      const data = await response.json();
      setGroupPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading group photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add to cart
  const addToCart = async (photoId: string) => {
    try {
      const response = await fetch(`/api/family/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          photo_id: photoId,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      // Show success feedback
      console.log('Added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  useEffect(() => {
    loadGroupPhotos();
  }, [token, selectedPhotoType, course]);

  const filteredPhotos = groupPhotos.filter(
    (photo) =>
      selectedPhotoType === 'all' || photo.photo_type === selectedPhotoType
  );

  const photoTypeLabels = {
    group: 'Group Photos',
    activity: 'Activity Photos',
    event: 'Event Photos',
  };

  if (!course) {
    return (
      <Card>
        <CardContent className="text-gray-500 dark:text-gray-400 p-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No course information available for group photos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Photos - {course.name}
          </CardTitle>
          <p className="text-gray-500 dark:text-gray-400">
            Photos of your class and group activities
          </p>
        </CardHeader>
      </Card>

      {/* Photo Type Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select
                value={selectedPhotoType}
                onValueChange={(value: any) => setSelectedPhotoType(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Group Photos</SelectItem>
                  <SelectItem value="group">Group Photos</SelectItem>
                  <SelectItem value="activity">Activity Photos</SelectItem>
                  <SelectItem value="event">Event Photos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">{filteredPhotos.length} photo(s)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">Loading group photos...</div>
          </CardContent>
        </Card>
      ) : filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-gray-500 dark:text-gray-400 text-center">
              <Camera className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No group photos available yet</p>
              <p className="mt-2 text-sm">
                Group photos will appear here once they're uploaded and approved
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="group overflow-hidden transition-shadow hover:shadow-lg"
            >
              <div className="bg-muted relative aspect-square">
                <img
                  src={photo.signed_url}
                  alt={photo.filename}
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setIsLightboxOpen(true);
                  }}
                />
                <div className="absolute left-2 top-2">
                  <Badge variant="secondary" className="text-xs">
                    {photoTypeLabels[photo.photo_type]}
                  </Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/20 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="truncate text-sm font-medium">
                    {photo.filename}
                  </p>
                </div>
                <div className="text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(photo.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addToCart(photo.id)}
                    className="flex-1"
                  >
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Add to Cart
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {selectedPhoto.filename}
                </DialogTitle>
                <DialogDescription>
                  {photoTypeLabels[selectedPhoto.photo_type]} • {course.name} •{' '}
                  {course.grade} {course.section}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative max-h-[60vh] max-w-full overflow-hidden rounded-lg">
                  <img
                    src={selectedPhoto.signed_url}
                    alt={selectedPhoto.filename}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <div className="flex w-full items-center justify-center gap-4">
                  <Button
                    onClick={() => addToCart(selectedPhoto.id)}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(selectedPhoto.signed_url, '_blank')
                    }
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Full Size
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: selectedPhoto.filename,
                          url: selectedPhoto.signed_url,
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                <div className="text-gray-500 dark:text-gray-400 text-center text-sm">
                  <p>
                    Taken on{' '}
                    {new Date(selectedPhoto.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    Added to course on{' '}
                    {new Date(selectedPhoto.tagged_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
