'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XIcon,
  UploadIcon,
  CheckIcon,
  AlertTriangleIcon,
  FileIcon,
  RotateCcwIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UploadQueueItem } from './types';
import { formatFileSize } from '@/lib/utils/image';
import { COMPONENT_CONFIG } from '@/lib/config/ui.config';

interface UploadQueueProps {
  uploadQueue: UploadQueueItem[];
  isUploading: boolean;
  onCancelUpload: (uploadId: string) => void;
  onRetryUpload: (uploadId: string) => void;
  onClearCompleted: () => void;
  className?: string;
}

const UploadQueueItemComponent = memo(({
  item,
  onCancel,
  onRetry,
}: {
  item: UploadQueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'uploading':
        return <UploadIcon className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'uploading': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 border-b border-gray-100"
    >
      {/* File icon and info */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">
            {item.file.name}
          </span>
          <Badge variant="outline" className={cn('text-xs', getStatusColor())}>
            {item.status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {formatFileSize(item.file.size)}
          </span>
          {item.error && (
            <span className="text-xs text-red-500 truncate">
              {item.error}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {item.status === 'uploading' && (
          <div className="mt-2">
            <Progress value={item.progress} className="h-1" />
            <span className="text-xs text-gray-500">
              {Math.round(item.progress)}%
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {item.status === 'error' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRetry(item.id)}
            className="h-6 w-6 p-0"
          >
            <RotateCcwIcon className="h-3 w-3" />
          </Button>
        )}
        
        {(item.status === 'pending' || item.status === 'error') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancel(item.id)}
            className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
          >
            <XIcon className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
});

UploadQueueItemComponent.displayName = 'UploadQueueItem';

const UploadQueueComponent = ({
  uploadQueue,
  isUploading,
  onCancelUpload,
  onRetryUpload,
  onClearCompleted,
  className,
}: UploadQueueProps) => {
  const completedItems = uploadQueue.filter(item => item.status === 'completed');
  const hasItems = uploadQueue.length > 0;

  if (!hasItems) {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <UploadIcon className={cn(
            'h-4 w-4',
            isUploading ? 'animate-pulse text-blue-500' : 'text-gray-500'
          )} />
          <h3 className="font-semibold text-sm">
            Upload Queue ({uploadQueue.length})
          </h3>
        </div>
        
        {completedItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCompleted}
            className="text-xs text-gray-500"
          >
            Clear completed
          </Button>
        )}
      </div>

      {/* Queue list */}
      <ScrollArea className={cn(
        'transition-all duration-200',
        uploadQueue.length > COMPONENT_CONFIG.UPLOAD_QUEUE.MAX_VISIBLE_ITEMS 
          ? `h-${COMPONENT_CONFIG.UPLOAD_QUEUE.MAX_HEIGHT}` 
          : 'max-h-96'
      )}>
        <AnimatePresence>
          {uploadQueue.map((item) => (
            <UploadQueueItemComponent
              key={item.id}
              item={item}
              onCancel={onCancelUpload}
              onRetry={onRetryUpload}
            />
          ))}
        </AnimatePresence>
      </ScrollArea>

      {/* Footer stats */}
      {hasItems && (
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              {uploadQueue.filter(i => i.status === 'pending').length} pending
            </span>
            <span>
              {uploadQueue.filter(i => i.status === 'uploading').length} uploading
            </span>
            <span>
              {completedItems.length} completed
            </span>
            <span>
              {uploadQueue.filter(i => i.status === 'error').length} errors
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export const UploadQueue = memo(UploadQueueComponent);
UploadQueue.displayName = 'UploadQueue';