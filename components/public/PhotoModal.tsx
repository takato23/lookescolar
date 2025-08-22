'use client'

import { PhotoModal as EnhancedPhotoModal } from '@/components/gallery/PhotoModal';

interface PhotoModalProps {
  isOpen: boolean
  onClose: () => void
  photo: {
    id: string
    signed_url: string
  } | null
  photos: Array<{
    id: string
    signed_url: string
  }>
  price?: number
}

// Wrapper component that provides backward compatibility with our Apple-grade PhotoModal
export function PhotoModal({ isOpen, onClose, photo, photos, price = 1000 }: PhotoModalProps) {
  return (
    <EnhancedPhotoModal
      isOpen={isOpen}
      onClose={onClose}
      photo={photo}
      photos={photos}
      price={price}
      familyMode={false}
    />
  );
}