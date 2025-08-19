'use client';

import React from 'react';
import { CheckIcon } from './icons';
import { useTheme } from './ThemeContext';

export type PhotoStatus = 'approved' | 'pending' | 'tagged';

export interface Photo {
  id: string;
  name: string;
  src: string;
  sizeKB: number;
  date: string;
  status: PhotoStatus;
}

interface PhotoCardProps {
  photo: Photo;
  selected: boolean;
  onToggleSelection: (id: string) => void;
  onPhotoClick: (photo: Photo) => void;
}

const getStatusConfig = (status: PhotoStatus) => {
  switch (status) {
    case 'approved':
      return {
        label: 'Aprobada',
        className: 'bg-emerald-500 text-white'
      };
    case 'pending':
      return {
        label: 'Pendiente',
        className: 'bg-amber-500 text-white'
      };
    case 'tagged':
      return {
        label: 'Etiquetada',
        className: 'bg-blue-500 text-white'
      };
    default:
      return {
        label: 'Sin estado',
        className: 'bg-gray-500 text-white'
      };
  }
};

export const PhotoCard: React.FC<PhotoCardProps> = ({ 
  photo, 
  selected, 
  onToggleSelection,
  onPhotoClick 
}) => {
  const { theme } = useTheme();
  const statusConfig = getStatusConfig(photo.status);
  
  return (
    <div 
      className={`relative group rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer
        ${theme === 'dark'
          ? `bg-gray-800/95 backdrop-blur-sm shadow-lg shadow-gray-900/25 hover:shadow-xl hover:shadow-gray-900/40 ${
              selected 
                ? 'border-blue-400 ring-2 ring-blue-400/30' 
                : 'border-gray-700 hover:border-gray-600'
            }`
          : `bg-white/95 backdrop-blur-sm shadow-lg shadow-gray-900/10 hover:shadow-xl hover:shadow-gray-900/20 ${
              selected 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`
        }
        hover:-translate-y-1 hover:scale-[1.02] transform-gpu`}
      aria-selected={selected}
      onClick={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // If clicking on checkbox, handle selection; otherwise open modal
        if (target.closest('[data-checkbox]')) {
          e.stopPropagation();
          onToggleSelection(photo.id);
        } else {
          onPhotoClick(photo);
        }
      }}
    >
      {/* 3D Depth Effect */}
      <div className={`absolute inset-0 rounded-2xl ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-700/20 to-gray-900/40' 
          : 'bg-gradient-to-br from-white/40 to-gray-100/60'
      } opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

      {/* Image container */}
      <div className={`relative aspect-square ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        {/* Checkbox - Top Left */}
        <button
          data-checkbox
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(photo.id);
          }}
          className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            selected
              ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
              : theme === 'dark'
                ? 'bg-gray-800/90 border-gray-600 hover:border-blue-400 text-white'
                : 'bg-white/90 border-gray-300 hover:border-blue-400 shadow-sm'
          }`}
          aria-label={selected ? 'Deseleccionar foto' : 'Seleccionar foto'}
          aria-pressed={selected}
        >
          {selected && (
            <CheckIcon size={16} className="text-white" />
          )}
        </button>

        {/* Status Badge - Top Right */}
        <div className={`absolute top-3 right-3 px-3 py-1 text-xs font-medium rounded-full shadow-sm ${statusConfig.className}`}>
          {statusConfig.label}
        </div>

        {/* Photo Image */}
        <div className={`w-full h-full flex items-center justify-center ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}>
          {/* Placeholder image with enhanced styling */}
          <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-inner ${
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <svg 
              className={`w-10 h-10 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
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

        {/* Selection Overlay */}
        {selected && (
          <div className="absolute inset-0 bg-blue-500/15 backdrop-blur-[1px] pointer-events-none" />
        )}

        {/* Hover Overlay for better visibility */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
          theme === 'dark' 
            ? 'bg-gradient-to-t from-black/20 via-transparent to-transparent' 
            : 'bg-gradient-to-t from-black/10 via-transparent to-transparent'
        }`} />
      </div>

      {/* Metadata Footer with enhanced styling */}
      <div className={`p-4 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-gray-800/80 to-gray-700/80' 
          : 'bg-gradient-to-r from-white/80 to-gray-50/80'
      }`}>
        <div className={`text-sm font-medium truncate mb-1 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
        }`}>
          {photo.name}
        </div>
        <div className={`flex items-center justify-between text-xs ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span className="font-medium">{photo.sizeKB} KB</span>
          <span>{photo.date}</span>
        </div>
      </div>
    </div>
  );
};