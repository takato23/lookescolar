export type EventStatus =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'completed'
  | 'archived'
  | 'paused'
  | (string & {});

export interface EventStats {
  totalPhotos?: number | null;
  totalSubjects?: number | null;
  totalRevenue?: number | null;
  completionRate?: number | null;
  totalOrders?: number | null;
  conversionRate?: number | null;
}

export interface AdminEvent {
  id: string;
  name?: string | null;
  school?: string | null;
  location?: string | null;
  date?: string | null;
  status?: EventStatus | null;
  created_at?: string | null;
  updated_at?: string | null;
  stats?: EventStats | null;
  // Optional media properties that may be present in the payload
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  coverUrl?: string | null;
  cover_url?: string | null;
  coverPhotoUrl?: string | null;
  cover_photo_url?: string | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  featuredPhotoUrl?: string | null;
  featured_photo_url?: string | null;
  heroImageUrl?: string | null;
  hero_image_url?: string | null;
  primary_photo_url?: string | null;
  posterUrl?: string | null;
  poster_url?: string | null;
}

export type EventViewMode = 'grid' | 'list';
