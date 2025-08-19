'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, CheckIcon } from './icons';
import { Photo } from './PhotoCard';
import { useTheme } from './ThemeContext';
import LiquidGlass from 'liquid-glass-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  initialPhotoIndex: number;
  selectedPhotos: Set<string>;
  onToggleSelection: (id: string) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialPhotoIndex,
  selectedPhotos,
  onToggleSelection,
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Update current index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialPhotoIndex);
    }
  }, [isOpen, initialPhotoIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex, photos.length, onClose]);

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const isSelected = selectedPhotos.has(currentPhoto.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Enhanced Backdrop with Liquid Glass */}
      <LiquidGlass
        displacementScale={30}
        blurAmount={0.25}
        saturation={80}
        aberrationIntensity={1.2}
        elasticity={0.1}
        cornerRadius={0}
        overLight={false}
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        style={{
          background: theme === 'dark' 
            ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 100%)' 
            : 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.8) 100%)'
        }}
      />
      
      {/* Modal Content Container with Liquid Glass */}
      <LiquidGlass
        displacementScale={40}
        blurAmount={0.08}
        saturation={110}
        aberrationIntensity={1.5}
        elasticity={0.2}
        cornerRadius={20}
        overLight={theme === 'light'}
        className="relative w-full h-full max-w-6xl mx-auto p-4"
      >
        <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 z-10">
          <div className={`flex items-center space-x-4 ${
            theme === 'dark' ? 'text-white' : 'text-white'
          }`}>
            <h2 className="text-lg font-semibold">
              {currentPhoto.name}
            </h2>
            <span className="text-sm opacity-75">
              {currentIndex + 1} de {photos.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Selection Button with Liquid Glass */}
            <LiquidGlass
              displacementScale={isSelected ? 35 : 25}
              blurAmount={0.06}
              saturation={isSelected ? 150 : 120}
              aberrationIntensity={isSelected ? 2 : 1.5}
              elasticity={0.5}
              cornerRadius={8}
              overLight={!isSelected}
              onClick={() => onToggleSelection(currentPhoto.id)}
              className="cursor-pointer transform hover:scale-110 transition-transform"
            >
              <div className={`p-2 transition-all ${
                isSelected 
                  ? 'text-white' 
                  : 'text-white/80'
              }`}>
                <CheckIcon size={20} />
              </div>
            </LiquidGlass>
            
            {/* Close Button with Liquid Glass */}
            <LiquidGlass
              displacementScale={30}
              blurAmount={0.06}
              saturation={120}
              aberrationIntensity={1.5}
              elasticity={0.5}
              cornerRadius={8}
              overLight={false}
              onClick={onClose}
              className="cursor-pointer transform hover:scale-110 transition-transform"
            >
              <div className="p-2 text-white/80 hover:text-white transition-colors">
                <XIcon size={20} />
              </div>
            </LiquidGlass>
          </div>
        </div>

        {/* Image Container */}
        <div 
          className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous Button - Desktop with Liquid Glass */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 hidden md:block">
            <LiquidGlass
              displacementScale={currentIndex === 0 ? 15 : 35}
              blurAmount={0.08}
              saturation={currentIndex === 0 ? 90 : 130}
              aberrationIntensity={currentIndex === 0 ? 1 : 2}
              elasticity={0.4}
              cornerRadius={999}
              overLight={false}
              onClick={currentIndex === 0 ? undefined : goToPrevious}
              className={`${currentIndex === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer transform hover:scale-110 transition-transform'}`}
            >
              <div className="p-3 flex items-center justify-center">
                <svg className={`w-6 h-6 ${currentIndex === 0 ? 'text-white/30' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </LiquidGlass>
          </div>

          {/* Photo */}
          <div className="relative max-w-full max-h-full">
            {/* Placeholder for actual image */}
            <div className={`w-full max-w-4xl aspect-square mx-auto rounded-2xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
            }`}>
              <div className={`w-32 h-32 rounded-2xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <svg 
                  className={`w-16 h-16 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                currentPhoto.status === 'approved' 
                  ? 'bg-emerald-500 text-white'
                  : currentPhoto.status === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {currentPhoto.status === 'approved' ? 'Aprobada' 
                 : currentPhoto.status === 'pending' ? 'Pendiente' 
                 : 'Etiquetada'}
              </span>
            </div>
          </div>

          {/* Next Button - Desktop with Liquid Glass */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 hidden md:block">
            <LiquidGlass
              displacementScale={currentIndex === photos.length - 1 ? 15 : 35}
              blurAmount={0.08}
              saturation={currentIndex === photos.length - 1 ? 90 : 130}
              aberrationIntensity={currentIndex === photos.length - 1 ? 1 : 2}
              elasticity={0.4}
              cornerRadius={999}
              overLight={false}
              onClick={currentIndex === photos.length - 1 ? undefined : goToNext}
              className={`${currentIndex === photos.length - 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer transform hover:scale-110 transition-transform'}`}
            >
              <div className="p-3 flex items-center justify-center">
                <svg className={`w-6 h-6 ${currentIndex === photos.length - 1 ? 'text-white/30' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </LiquidGlass>
          </div>

          {/* Swipe Hint - Mobile */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 md:hidden">
            <div className="bg-white/20 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              Desliza para navegar
            </div>
          </div>
        </div>

        {/* Footer with metadata */}
        <div className={`mt-4 flex items-center justify-between text-sm ${
          theme === 'dark' ? 'text-white/80' : 'text-white/80'
        }`}>
          <div className="flex items-center space-x-4">
            <span>{currentPhoto.sizeKB} KB</span>
            <span>{currentPhoto.date}</span>
          </div>
          
          {/* Dots indicator */}
          <div className="flex items-center space-x-1">
            {photos.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, index) => {
              const actualIndex = Math.max(0, currentIndex - 2) + index;
              return (
                <button
                  key={actualIndex}
                  onClick={() => setCurrentIndex(actualIndex)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    actualIndex === currentIndex 
                      ? 'bg-white' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Ir a foto ${actualIndex + 1}`}
                />
              );
            })}
          </div>
        </div>
        </div>
      </LiquidGlass>
    </div>
  );
};
