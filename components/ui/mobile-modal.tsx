'use client';

import { useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showHandle?: boolean;
  className?: string;
}

export function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showHandle = true,
  className,
}: MobileModalProps) {
  const { isMobileView } = useMobileDetection();
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
    };
  }, [isOpen]);

  const getModalHeight = () => {
    switch (size) {
      case 'small':
        return 'h-1/3';
      case 'medium':
        return 'h-1/2';
      case 'large':
        return 'h-2/3';
      case 'fullscreen':
        return 'h-full';
      default:
        return 'h-1/2';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const y = e.touches[0].clientY;
    setCurrentY(y - startY);
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setIsDragging(false);
    setCurrentY(0);
  };

  const modalVariants = {
    hidden: {
      y: '100%',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    visible: {
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  if (!isMobileView) {
    // Fallback to regular modal for desktop
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={backdropVariants}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-6 shadow-xl"
            >
              {title && (
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:bg-muted hover:text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            style={{
              transform: isDragging
                ? `translateY(${Math.max(0, currentY)}px)`
                : undefined,
            }}
            className={clsx(
              'fixed bottom-0 left-0 right-0 z-50',
              'rounded-t-3xl bg-white shadow-2xl',
              getModalHeight(),
              'flex flex-col',
              className
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center py-3">
                <div className="h-1.5 w-12 rounded-full bg-gray-300" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="mobile-touch-target rounded-xl p-2 text-gray-400 hover:bg-muted hover:text-muted-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile-optimized sheet modal for actions
interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions,
}: MobileActionSheetProps) {
  const { isMobileView } = useMobileDetection();

  if (!isMobileView) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="safe-area-padding fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-6 py-2">
                <h3 className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {title}
                </h3>
              </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={clsx(
                      'mobile-touch-target flex w-full items-center justify-center rounded-xl px-4 py-4 text-base font-medium transition-colors',
                      'mb-2 last:mb-0',
                      action.variant === 'destructive'
                        ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                        : 'text-foreground hover:bg-muted active:bg-muted'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={clsx(
                          'mr-3 h-5 w-5',
                          action.variant === 'destructive'
                            ? 'text-red-600'
                            : 'text-gray-500'
                        )}
                      />
                    )}
                    {action.label}
                  </button>
                );
              })}

              {/* Cancel button */}
              <button
                onClick={onClose}
                className="mobile-touch-target mt-4 flex w-full items-center justify-center rounded-xl bg-muted px-4 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted active:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile-optimized drawer
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  width?: string;
  className?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'left',
  width = 'w-80',
  className,
}: MobileDrawerProps) {
  const { isMobileView } = useMobileDetection();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMobileView) {
    return null;
  }

  const slideDirection = side === 'left' ? { x: '-100%' } : { x: '100%' };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={slideDirection}
            animate={{ x: 0 }}
            exit={slideDirection}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={clsx(
              'fixed top-0 z-50 h-full bg-white shadow-2xl',
              side === 'left' ? 'left-0' : 'right-0',
              width,
              'max-w-[85vw]',
              'flex flex-col',
              className
            )}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b border-border px-6 py-4 pt-12">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="mobile-touch-target rounded-xl p-2 text-gray-400 hover:bg-muted hover:text-muted-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
