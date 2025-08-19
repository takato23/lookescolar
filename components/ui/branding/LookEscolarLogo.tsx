'use client';
import * as React from 'react';

interface LookEscolarLogoProps {
  variant?: 'blue' | 'purple' | 'gradient' | 'soft';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LookEscolarLogo({ variant = 'blue', size = 'md', className = '' }: LookEscolarLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const getColors = () => {
    switch (variant) {
      case 'blue':
        return {
          camera: '#3B82F6', // Blue-500 - matches dashboard
          cameraLight: '#60A5FA', // Blue-400 - lighter accent
          hat: '#8B5CF6', // Violet-500 - matches purple gradients
          hatDark: '#7C3AED', // Violet-600 - deeper purple
          face: '#10B981', // Emerald-500 - consistent green
          strap: '#1E40AF' // Blue-800 - deep accent
        };
      case 'purple':
        return {
          camera: '#7C3AED', // Violet-600
          cameraLight: '#A78BFA', // Violet-400
          hat: '#5B21B6', // Violet-800
          hatDark: '#4C1D95', // Violet-900
          face: '#10B981', // Emerald-500
          strap: '#581C87' // Violet-900
        };
      case 'gradient':
        return {
          camera: '#3B82F6', // Blue-500
          cameraLight: '#60A5FA', // Blue-400
          hat: '#8B5CF6', // Violet-500
          hatDark: '#7C3AED', // Violet-600
          face: '#10B981', // Emerald-500
          strap: '#1D4ED8' // Blue-700
        };
      case 'soft':
        return {
          camera: '#A78BFA', // Violet-400
          cameraLight: '#C4B5FD', // Violet-300
          hat: '#DDD6FE', // Violet-200
          hatDark: '#A78BFA', // Violet-400
          face: '#34D399', // Emerald-400
          strap: '#8B5CF6' // Violet-500
        };
      default:
        return {
          camera: '#4F46E5',
          cameraLight: '#60A5FA',
          hat: '#7C3AED',
          hatDark: '#5B21B6',
          face: '#10B981',
          strap: '#1E40AF'
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        className="w-full h-full"
        aria-label="LookEscolar - Fotografía Escolar"
      >
        {/* Birrete Académico */}
        <g transform="translate(25, 5)">
          {/* Base del birrete */}
          <ellipse
            cx="25"
            cy="25"
            rx="28"
            ry="8"
            fill={colors.hat}
            transform="rotate(-5)"
          />
          {/* Sombra del birrete */}
          <ellipse
            cx="25"
            cy="27"
            rx="26"
            ry="6"
            fill={colors.hatDark}
            transform="rotate(-5)"
            opacity="0.7"
          />
          {/* Borla */}
          <circle cx="45" cy="20" r="3" fill={colors.face} />
          <line x1="42" y1="22" x2="38" y2="26" stroke={colors.strap} strokeWidth="1.5" />
        </g>

        {/* Cámara Principal */}
        <g transform="translate(15, 25)">
          {/* Cuerpo de la cámara */}
          <rect
            x="0"
            y="15"
            width="70"
            height="45"
            rx="12"
            ry="12"
            fill={colors.camera}
            stroke="#1E293B"
            strokeWidth="3"
          />
          
          {/* Parte superior de la cámara */}
          <rect
            x="5"
            y="10"
            width="60"
            height="20"
            rx="8"
            ry="8"
            fill={colors.cameraLight}
            stroke="#1E293B"
            strokeWidth="2"
          />

          {/* Lente exterior */}
          <circle
            cx="35"
            cy="37"
            r="18"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="2"
          />
          
          {/* Lente interior */}
          <circle
            cx="35"
            cy="37"
            r="14"
            fill={colors.camera}
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Cara sonriente */}
          <circle cx="35" cy="37" r="10" fill={colors.face} />
          
          {/* Ojos */}
          <circle cx="31" cy="34" r="1.5" fill="#1E293B" />
          <circle cx="39" cy="34" r="1.5" fill="#1E293B" />
          
          {/* Sonrisa */}
          <path
            d="M 30 40 Q 35 44 40 40"
            stroke="#1E293B"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Flash */}
          <rect x="10" y="15" width="6" height="4" rx="2" fill="#F8FAFC" opacity="0.9" />
          
          {/* Botón de disparo */}
          <circle cx="55" cy="20" r="3" fill={colors.hatDark} />
        </g>

        {/* Correa de la cámara */}
        <g>
          <path
            d="M 25 35 Q 15 30 12 40 Q 10 50 15 55"
            stroke={colors.strap}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M 75 35 Q 85 30 88 40 Q 90 50 85 55"
            stroke={colors.strap}
            strokeWidth="2"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

export default LookEscolarLogo;
