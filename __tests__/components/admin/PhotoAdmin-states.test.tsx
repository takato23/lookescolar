/**
 * UI tests for PhotoAdmin component states
 * Tests empty, error, and loading states for the critical folders API bug
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PhotoAdmin from '@/components/admin/PhotoAdmin';

// Mock dependencies
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value, // No debouncing in tests
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

// Mock the API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PhotoAdmin Component States', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for faster tests
          gcTime: 0, // Disable caching for tests
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderPhotoAdmin = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PhotoAdmin {...props} />
      </QueryClientProvider>
    );
  };

  describe('Empty State', () => {
    it('should show empty folders state when no folders exist', async () => {
      // Mock successful but empty folders response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          folders: [],
          count: 0,
        }),
      });

      renderPhotoAdmin();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('No folders yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Create First Folder')).toBeInTheDocument();
    });

    it('should show empty photos state when folder has no photos', async () => {
      // Mock folders response with one folder
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            folders: [
              {
                id: 'folder-1',
                name: 'Test Folder',
                parent_id: null,
                depth: 0,
                photo_count: 0,
                has_children: false,
              },
            ],
            count: 1,
          }),
        })
        // Mock empty assets response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            assets: [],
            count: 0,
            hasMore: false,
          }),
        });

      renderPhotoAdmin();

      await waitFor(() => {
        expect(
          screen.getByText('No photos in this folder')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          'Upload photos or select a different folder to view content.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when folders API returns 500', async () => {
      // Mock 500 error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error',
        }),
      });

      renderPhotoAdmin();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      });

      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show error state when folders API returns 404', async () => {
      // Mock 404 error response (database table not found)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Database table not found',
        }),
      });

      renderPhotoAdmin();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      });

      expect(screen.getByText('Database table not found')).toBeInTheDocument();
    });

    it('should show error state when folders API returns 403', async () => {
      // Mock 403 error response (access denied)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Database access denied',
        }),
      });

      renderPhotoAdmin();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      });

      expect(screen.getByText('Database access denied')).toBeInTheDocument();
    });

    it('should show generic error for network failures', async () => {
      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderPhotoAdmin();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      });

      // Should show a generic error message
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching folders', async () => {
      // Mock delayed response
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  folders: [],
                  count: 0,
                }),
              });
            }, 100);
          })
      );

      renderPhotoAdmin();

      // Should show loading state initially
      expect(screen.getByText('Loading folders...')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText('Loading folders...')
        ).not.toBeInTheDocument();
      });
    });

    it('should show loading state while fetching photos', async () => {
      // Mock folders response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            folders: [
              {
                id: 'folder-1',
                name: 'Test Folder',
                parent_id: null,
                depth: 0,
                photo_count: 5,
                has_children: false,
              },
            ],
            count: 1,
          }),
        })
        // Mock delayed assets response
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    assets: [],
                    count: 0,
                    hasMore: false,
                  }),
                });
              }, 100);
            })
        );

      renderPhotoAdmin();

      // Wait for folders to load, then check for photos loading
      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeInTheDocument();
      });

      // Should show loading photos state
      expect(screen.getByText('Loading photos...')).toBeInTheDocument();

      // Wait for photos loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading photos...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Upload State', () => {
    it('should disable upload button when no folder is selected', async () => {
      // Mock empty folders response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          folders: [],
          count: 0,
        }),
      });

      renderPhotoAdmin({ enableUpload: true });

      await waitFor(() => {
        const uploadButton = screen.getByText('Upload');
        expect(uploadButton).toBeInTheDocument();
        // Should be disabled when no folder selected
        expect(uploadButton.closest('button')).toBeDisabled();
      });
    });

    it('should enable upload button when folder is selected', async () => {
      // Mock folders response with one folder
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            folders: [
              {
                id: 'folder-1',
                name: 'Test Folder',
                parent_id: null,
                depth: 0,
                photo_count: 0,
                has_children: false,
              },
            ],
            count: 1,
          }),
        })
        // Mock empty assets response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            assets: [],
            count: 0,
            hasMore: false,
          }),
        });

      renderPhotoAdmin({ enableUpload: true });

      await waitFor(() => {
        const uploadButton = screen.getByText('Upload');
        expect(uploadButton).toBeInTheDocument();
        // Should be enabled when folder is selected (automatically selects first folder)
        expect(uploadButton.closest('button')).not.toBeDisabled();
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('should still show interface even when folders API fails', async () => {
      // Mock folders API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Database error',
        }),
      });

      renderPhotoAdmin();

      await waitFor(() => {
        // Should show error state but still have basic interface
        expect(screen.getByText('Photos')).toBeInTheDocument(); // Header should still be there
        expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument(); // Recovery option
      });
    });

    it('should maintain egress monitoring display', async () => {
      // Mock successful folders response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          folders: [],
          count: 0,
        }),
      });

      renderPhotoAdmin();

      await waitFor(() => {
        // Should show egress monitoring indicator
        expect(screen.getByText(/MB$/)).toBeInTheDocument(); // Egress usage display
      });
    });
  });
});
