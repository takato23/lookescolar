'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Camera, 
  Calendar, 
  Download, 
  ShoppingCart,
  Eye,
  Heart,
  Share2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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

export default function GroupPhotosSection({ token, course }: GroupPhotosSectionProps) {
  const [groupPhotos, setGroupPhotos] = useState<GroupPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'all' | 'group' | 'activity' | 'event'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<GroupPhoto | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Load group photos
  const loadGroupPhotos = async () => {
    if (!course) return;
    
    setLoading(true);
    try {
      const photoTypeParam = selectedPhotoType !== 'all' ? `?photo_type=${selectedPhotoType}` : '';
      const response = await fetch(`/api/family/gallery/${token}/group-photos${photoTypeParam}`);
      
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

  const filteredPhotos = groupPhotos.filter(photo => 
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
        <CardContent className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
          <p className="text-muted-foreground">
            Photos of your class and group activities
          </p>
        </CardHeader>
      </Card>

      {/* Photo Type Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedPhotoType} onValueChange={(value: any) => setSelectedPhotoType(value)}>
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
            <Badge variant="secondary">
              {filteredPhotos.length} photo(s)
            </Badge>
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
            <div className="text-center text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No group photos available yet</p>
              <p className="text-sm mt-2">
                Group photos will appear here once they're uploaded and approved
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map(photo => (
            <Card key={photo.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative aspect-square bg-muted">
                <img
                  src={photo.signed_url}
                  alt={photo.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setIsLightboxOpen(true);
                  }}
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {photoTypeLabels[photo.photo_type]}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium truncate">{photo.filename}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
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
                    <ShoppingCart className="h-3 w-3 mr-1" />
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {selectedPhoto.filename}
                </DialogTitle>
                <DialogDescription>
                  {photoTypeLabels[selectedPhoto.photo_type]} • {course.name} • {course.grade} {course.section}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="relative max-w-full max-h-[60vh] overflow-hidden rounded-lg">
                  <img
                    src={selectedPhoto.signed_url}
                    alt={selectedPhoto.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                
                <div className="flex items-center gap-4 w-full justify-center">
                  <Button
                    onClick={() => addToCart(selectedPhoto.id)}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedPhoto.signed_url, '_blank')}
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
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>Taken on {new Date(selectedPhoto.created_at).toLocaleDateString()}</p>
                  <p>Added to course on {new Date(selectedPhoto.tagged_at).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}