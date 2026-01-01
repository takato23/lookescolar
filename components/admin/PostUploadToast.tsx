'use client';

import React from 'react';
import { CheckCircleIcon, ImageIcon, TagIcon, EyeIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UploadResult {
  uploadedCount: number;
  eventId?: string;
  eventName?: string;
  photoType: 'private' | 'public' | 'classroom';
  qrDetection?: {
    detected: number;
    auto_assigned: number;
  };
}

interface PostUploadToastProps {
  result: UploadResult;
  onViewPhotos?: () => void;
  onTagNow?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function PostUploadToast({
  result,
  onViewPhotos,
  onTagNow,
  onClose,
  className
}: PostUploadToastProps) {
  const { uploadedCount, eventName, photoType, qrDetection } = result;

  const photoTypeConfig = {
    private: {
      label: 'Clientes',
      icon: '👨‍👩‍👧‍👦',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    classroom: {
      label: 'Del Salón',
      icon: '🏫',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-700',
      textColor: 'text-purple-700 dark:text-purple-300'
    },
    public: {
      label: 'Públicas',
      icon: '🌍',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      textColor: 'text-green-700 dark:text-green-300'
    }
  };

  const config = photoTypeConfig[photoType];
  const hasQRDetection = qrDetection && qrDetection.detected > 0;

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[400px] max-w-[500px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground dark:text-gray-100 text-sm">
            ✅ {uploadedCount} foto{uploadedCount !== 1 ? 's' : ''} subida{uploadedCount !== 1 ? 's' : ''} exitosamente
          </h3>
          
          <div className="flex items-center gap-2 mt-1">
            {/* Event Badge */}
            {eventName && (
              <Badge variant="outline" className="text-xs bg-muted dark:bg-gray-800 text-foreground dark:text-gray-300">
                📸 {eventName}
              </Badge>
            )}
            
            {/* Photo Type Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                config.bgColor,
                config.borderColor,
                config.textColor
              )}
            >
              {config.icon} {config.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* QR Detection Info */}
      {hasQRDetection && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded flex items-center justify-center">
              <TagIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                🔍 QR Detection: {qrDetection.detected} detectados
              </div>
              <div className="text-blue-600 dark:text-blue-300 text-xs">
                {qrDetection.auto_assigned} asignados automáticamente
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onViewPhotos && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewPhotos}
            className="flex-1 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Ver fotos
            <ArrowRightIcon className="h-3 w-3 ml-2" />
          </Button>
        )}
        
        {onTagNow && hasQRDetection && qrDetection.detected > qrDetection.auto_assigned && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTagNow}
            className="flex-1 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/20"
          >
            <TagIcon className="h-4 w-4 mr-2" />
            Etiquetar ahora
          </Button>
        )}
      </div>

      {/* Progress Summary */}
      <div className="mt-3 pt-3 border-t border-border dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {uploadedCount} archivo{uploadedCount !== 1 ? 's' : ''} procesado{uploadedCount !== 1 ? 's' : ''}
          </span>
          {hasQRDetection && (
            <span>
              {Math.round((qrDetection.auto_assigned / qrDetection.detected) * 100)}% auto-etiquetado
            </span>
          )}
        </div>
        
        {hasQRDetection && (
          <div className="mt-2">
            <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(qrDetection.auto_assigned / qrDetection.detected) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to create the toast
export function createPostUploadToast(
  result: UploadResult,
  options: {
    onViewPhotos?: () => void;
    onTagNow?: () => void;
    duration?: number;
  } = {}
) {
  const { onViewPhotos, onTagNow, duration = 6000 } = options;
  
  return {
    duration,
    component: (
      <PostUploadToast
        result={result}
        onViewPhotos={onViewPhotos}
        onTagNow={onTagNow}
      />
    )
  };
}
