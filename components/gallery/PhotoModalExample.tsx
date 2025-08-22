'use client';

import { useState } from 'react';
import { PhotoModal } from './PhotoModal';

// Example usage showing both interface patterns

export function PhotoModalExample() {
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [isPublicModalOpen, setIsPublicModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Apple-grade interface example data
  const applePhoto = {
    id: 'photo-1',
    storage_path: 'events/school-1/photo-1.jpg',
    width: 1200,
    height: 800,
    created_at: '2024-01-15T10:30:00Z',
  };

  // Public interface example data
  const publicPhotos = [
    {
      id: 'photo-1',
      signed_url: 'https://example.com/photo-1.jpg',
    },
    {
      id: 'photo-2', 
      signed_url: 'https://example.com/photo-2.jpg',
    }
  ];

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Enhanced PhotoModal Examples</h2>
      
      <div className="flex gap-4">
        <button
          onClick={() => setIsAppleModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Open Apple-grade Modal
        </button>
        
        <button
          onClick={() => setIsPublicModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg"
        >
          Open Public Modal (Backward Compatible)
        </button>
      </div>

      {/* Apple-grade interface */}
      <PhotoModal
        photo={applePhoto}
        isOpen={isAppleModalOpen}
        onClose={() => setIsAppleModalOpen(false)}
        onPrevious={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
        onNext={() => setCurrentIndex(prev => prev + 1)}
        currentIndex={currentIndex + 1}
        totalPhotos={3}
      />

      {/* Public interface (backward compatible) */}
      <PhotoModal
        isOpen={isPublicModalOpen}
        onClose={() => setIsPublicModalOpen(false)}
        photo={publicPhotos[0]}
        photos={publicPhotos}
        price={1000}
        isSelected={false}
        onToggleSelection={() => console.log('Photo selection toggled')}
      />
    </div>
  );
}