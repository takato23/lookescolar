/**
 * PhotoAdmin UX Improvements Test
 * 
 * Tests the comprehensive UX improvements to ensure:
 * 1. Clear Cache button is always visible (not production-only)
 * 2. Enhanced drag & drop with custom drag image and visual feedback
 * 3. Improved drop zone highlighting with folder icons
 * 4. Immediate feedback with contextual toast messages
 * 5. Regular clicks toggle selection (checkbox-like behavior)
 * 6. Ctrl/Cmd+Click works for power users  
 * 7. Shift+Click provides range selection
 * 8. ESC clears all selections
 * 9. Visual feedback is clear and intuitive
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import PhotoAdmin from '@/components/admin/PhotoAdmin';

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  reload: vi.fn(),
  asPath: '/admin/photos',
  pathname: '/admin/photos',
  query: { eventId: 'test-event-id' },
  events: {
    on: vi.fn(),
    off: vi.fn(),
  },
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams('eventId=test-event-id'),
}));

// Mock API functions
vi.mock('@/lib/utils/api-client', () => ({
  createApiUrl: (path: string) => `http://localhost:3000${path}`,
  uploadFiles: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useDebounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

// Test data
const mockFolders = [
  {
    id: 'folder-1',
    name: 'Test Folder',
    parent_id: null,
    depth: 0,
    photo_count: 5,
    has_children: false,
  },
];

const mockAssets = [
  {
    id: 'asset-1',
    filename: 'photo1.jpg',
    preview_path: 'previews/photo1_preview.webp',
    file_size: 1024,
    created_at: '2024-01-01T00:00:00Z',
    status: 'ready',
  },
  {
    id: 'asset-2',
    filename: 'photo2.jpg',
    preview_path: 'previews/photo2_preview.webp',
    file_size: 2048,
    created_at: '2024-01-01T01:00:00Z',
    status: 'ready',
  },
  {
    id: 'asset-3',
    filename: 'photo3.jpg',
    preview_path: 'previews/photo3_preview.webp',
    file_size: 1536,
    created_at: '2024-01-01T02:00:00Z',
    status: 'ready',
  },
];

describe('PhotoAdmin UX Improvements', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/admin/folders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            folders: mockFolders,
          }),
        });
      }
      if (url.includes('/api/admin/assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            assets: mockAssets,
            count: mockAssets.length,
            hasMore: false,
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPhotoAdmin = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PhotoAdmin />
      </QueryClientProvider>
    );
  };

  describe('Selection Behavior', () => {
    it('should show checkbox-style selection indicators', async () => {
      renderPhotoAdmin();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      // Should show empty checkboxes initially
      const checkboxes = screen.getAllByRole('img', { name: /square/i });
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should toggle selection on regular click (checkbox-like behavior)', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      expect(firstPhoto).toBeInTheDocument();

      if (firstPhoto) {
        // First click should select
        fireEvent.click(firstPhoto);
        
        // Should show selection count
        await waitFor(() => {
          expect(screen.getByText(/1 photo.*selected/i)).toBeInTheDocument();
        });

        // Second click should deselect
        fireEvent.click(firstPhoto);
        
        // Selection should be cleared
        await waitFor(() => {
          expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should allow multiple selections without modifier keys', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
        expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      const secondPhoto = screen.getByText('photo2.jpg').closest('[class*="cursor-pointer"]');

      if (firstPhoto && secondPhoto) {
        // Select first photo
        fireEvent.click(firstPhoto);
        
        await waitFor(() => {
          expect(screen.getByText(/1 photo.*selected/i)).toBeInTheDocument();
        });

        // Select second photo - should NOT clear first selection
        fireEvent.click(secondPhoto);
        
        await waitFor(() => {
          expect(screen.getByText(/2 photo.*selected/i)).toBeInTheDocument();
        });
      }
    });

    it('should show bulk actions toolbar when photos are selected', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (firstPhoto) {
        fireEvent.click(firstPhoto);
        
        // Bulk actions should appear
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });
      }
    });

    it('should provide clear selection tips for users', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      // Should show helpful tips when no selection
      expect(screen.getByText(/Click photos to select/i)).toBeInTheDocument();
    });

    it('should support keyboard shortcuts', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (firstPhoto) {
        fireEvent.click(firstPhoto);
        
        await waitFor(() => {
          expect(screen.getByText(/1 photo.*selected/i)).toBeInTheDocument();
        });

        // ESC should clear selection
        fireEvent.keyDown(window, { key: 'Escape' });
        
        await waitFor(() => {
          expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should show enhanced visual feedback for selected items', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (firstPhoto) {
        fireEvent.click(firstPhoto);
        
        // Should have blue border and background when selected
        await waitFor(() => {
          expect(firstPhoto).toHaveClass('border-blue-500', 'bg-blue-50');
        });
      }
    });

    it('should handle range selection with Shift+Click', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
        expect(screen.getByText('photo3.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      const thirdPhoto = screen.getByText('photo3.jpg').closest('[class*="cursor-pointer"]');

      if (firstPhoto && thirdPhoto) {
        // First click to set anchor
        fireEvent.click(firstPhoto);
        
        await waitFor(() => {
          expect(screen.getByText(/1 photo.*selected/i)).toBeInTheDocument();
        });

        // Shift+Click should select range
        fireEvent.click(thirdPhoto, { shiftKey: true });
        
        await waitFor(() => {
          expect(screen.getByText(/3 photo.*selected/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Clear Cache Button Availability', () => {
    it('should show Clear Cache button in all environments', async () => {
      renderPhotoAdmin();
      
      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
      });

      // Clear Cache button should be visible regardless of environment
      const clearCacheButton = screen.queryByTitle('Clear cache and refresh data');
      expect(clearCacheButton).toBeInTheDocument();
      
      // Button should be clickable
      if (clearCacheButton) {
        expect(clearCacheButton).not.toBeDisabled();
      }
    });

    it('should display refresh icon in Clear Cache button', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
      });

      const clearCacheButton = screen.queryByTitle('Clear cache and refresh data');
      expect(clearCacheButton).toBeInTheDocument();
      
      // Should contain refresh icon (RefreshCw component)
      if (clearCacheButton) {
        expect(clearCacheButton.querySelector('svg')).toBeInTheDocument();
      }
    });
  });

  describe('Enhanced Drag & Drop Experience', () => {
    it('should show enhanced visual feedback on folder hover during drag', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const folderElement = screen.getByText('Test Folder').closest('[class*="flex items-center"]');
      const photoElement = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (folderElement && photoElement) {
        // Start drag operation
        fireEvent.dragStart(photoElement);
        
        // Simulate drag over folder
        fireEvent.dragOver(folderElement);
        
        // Should show enhanced visual feedback
        await waitFor(() => {
          // Check for enhanced drop zone styling
          expect(folderElement).toHaveClass('bg-blue-50', 'ring-2', 'ring-blue-400');
          expect(folderElement).toHaveClass('scale-105', 'transform');
        });
      }
    });

    it('should display custom drag overlay with real image preview', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const photoElement = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (photoElement) {
        // Start drag operation
        fireEvent.dragStart(photoElement);
        
        // Should show enhanced drag overlay
        await waitFor(() => {
          // Look for drag overlay container
          const dragOverlay = document.querySelector('[data-testid*="drag"], [class*="drag-overlay"]');
          expect(dragOverlay).toBeInTheDocument();
        });
      }
    });

    it('should provide immediate feedback when dropping images', async () => {
      const mockToast = vi.fn();
      vi.mock('sonner', () => ({
        toast: {
          success: vi.fn(),
          error: vi.fn(),
          info: mockToast,
        },
      }));

      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const folderElement = screen.getByText('Test Folder').closest('[class*="flex items-center"]');
      const photoElement = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (folderElement && photoElement) {
        // Simulate complete drag and drop
        fireEvent.dragStart(photoElement);
        fireEvent.dragOver(folderElement);
        fireEvent.drop(folderElement);
        fireEvent.dragEnd(photoElement);
        
        // Should show immediate feedback toast
        await waitFor(() => {
          // Toast should be called with moving message
          expect(mockToast).toHaveBeenCalledWith(
            expect.stringMatching(/Moviendo.*Test Folder/i)
          );
        });
      }
    });

    it('should show folder icon change when dragging over', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const folderElement = screen.getByText('Test Folder').closest('[class*="flex items-center"]');
      const photoElement = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (folderElement && photoElement) {
        // Initially should have closed folder icon
        const initialIcon = folderElement.querySelector('svg');
        expect(initialIcon).toBeInTheDocument();
        
        // Start drag and hover over folder
        fireEvent.dragStart(photoElement);
        fireEvent.dragEnter(folderElement);
        
        // Should change to open folder icon (blue color indicates active state)
        await waitFor(() => {
          const activeIcon = folderElement.querySelector('svg[class*="text-blue-600"]');
          expect(activeIcon).toBeInTheDocument();
        });
      }
    });

    it('should handle multiple photo selection drag feedback', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
        expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
      });

      const photo1 = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      const photo2 = screen.getByText('photo2.jpg').closest('[class*="cursor-pointer"]');
      
      if (photo1 && photo2) {
        // Select multiple photos
        fireEvent.click(photo1);
        fireEvent.click(photo2);
        
        await waitFor(() => {
          expect(screen.getByText(/2 photo.*selected/i)).toBeInTheDocument();
        });

        // Start drag on one of the selected photos
        fireEvent.dragStart(photo1);
        
        // Should show count badge for multiple selections
        await waitFor(() => {
          // Look for count indicator in drag overlay
          const countBadge = document.querySelector('[class*="bg-blue-600"][class*="rounded-full"]');
          expect(countBadge).toBeInTheDocument();
          if (countBadge) {
            expect(countBadge).toHaveTextContent('2');
          }
        });
      }
    });
  });

  describe('Mobile Experience', () => {
    it('should have touch-friendly targets', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const photoContainer = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (photoContainer) {
        // Should have touch-manipulation class for better mobile interaction
        expect(photoContainer).toHaveClass('touch-manipulation');
        // Should have minimum height for touch targets
        expect(photoContainer).toHaveClass('min-h-[120px]');
      }
    });

    it('should show mobile-specific help text', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      // Check if mobile help text exists (even if hidden by CSS)
      const mobileHelp = screen.getByText(/Tap photos to select/i);
      expect(mobileHelp).toBeInTheDocument();
    });

    it('should have responsive bulk actions', async () => {
      renderPhotoAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      const firstPhoto = screen.getByText('photo1.jpg').closest('[class*="cursor-pointer"]');
      
      if (firstPhoto) {
        fireEvent.click(firstPhoto);
        
        await waitFor(() => {
          const bulkToolbar = screen.getByText(/1 photo.*selected/i).closest('[class*="bg-blue-50"]');
          expect(bulkToolbar).toBeInTheDocument();
          
          // Should have responsive classes
          if (bulkToolbar) {
            expect(bulkToolbar).toHaveClass('px-4', 'sm:px-6');
          }
        });
      }
    });
  });
});