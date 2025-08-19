'use client';

import React from 'react';
import LiquidGlass from 'liquid-glass-react';
import { CheckIcon } from './icons';

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
  onToggleSelection 
}) => {
  const statusConfig = getStatusConfig(photo.status);
  
  return (
    <LiquidGlass
      displacementScale={45}
      blurAmount={0.06}
      elasticity={0.3}
      cornerRadius={16}
      overLight={true}
      saturation={140}
      aberrationIntensity={2}
      className={`relative group shadow-sm overflow-hidden border-2 transition-all duration-200 hover:shadow-lg ${
        selected ? 'border-blue-400 ring-2 ring-blue-300/50' : 'border-gray-300/50'
      }`}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelection(photo.id);
      }}
    >
      <div 
        className="relative bg-white/50"
        aria-selected={selected}
      >
      {/* Image container */}
      <div className="relative aspect-square bg-gray-100">
        {/* Checkbox - Top Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            selected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-white/90 border-gray-300 hover:border-blue-400'
          }`}
          aria-label={selected ? 'Deseleccionar foto' : 'Seleccionar foto'}
          aria-pressed={selected}
        >
          {selected && (
            <CheckIcon size={16} className="text-white" />
          )}
        </button>

        {/* Status Badge - Top Right */}
        <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.className}`}>
          {statusConfig.label}
        </div>

        {/* Photo Image */}
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          {/* Placeholder image */}
          <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-gray-500" 
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
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
        )}
      </div>

      {/* Metadata Footer */}
      <div className="p-3 space-y-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {photo.name}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{photo.sizeKB} KB</span>
          <span>{photo.date}</span>
        </div>
      </div>
    </div>
    </LiquidGlass>
  );
};