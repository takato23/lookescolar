/**
 * PhotoAdmin Component Tests
 * Tests for the ultra-optimized PhotoAdmin component with egress monitoring
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PhotoAdmin from '@/components/admin/PhotoAdmin';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock API responses
const mockFoldersResponse = {
  success: true,
  folders: [
    {
      id: 'folder-1',
      name: 'Test Folder 1',
      parent_id: null,
      depth: 0,
      photo_count: 5,
      has_children: false,
    },
    {
      id: 'folder-2',
      name: 'Test Folder 2',
      parent_id: null,
      depth: 0,
      photo_count: 3,
      has_children: true,
    },
  ],
  count: 2,
};

const mockAssetsResponse = {
  success: true,
  assets: [
    {
      id: 'asset-1',
      filename: 'test1.jpg',
      preview_path: '/preview/test1.jpg',
      file_size: 1024 * 500, // 500KB
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'asset-2',
      filename: 'test2.jpg',
      preview_path: '/preview/test2.jpg',
      file_size: 1024 * 750, // 750KB
      created_at: '2024-01-02T00:00:00Z',
      status: 'processing',
    },
  ],
  count: 2,
  hasMore: false,
};

// Mock fetch
global.fetch = vi.fn((url: string) => {
  if (url.includes('/api/admin/folders')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockFoldersResponse),
    });
  }
  if (url.includes('/api/admin/assets')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAssetsResponse),
    });
  }
  return Promise.reject(new Error('Unexpected API call'));
}) as any;

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('PhotoAdmin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('renders successfully', () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search photos...')).toBeInTheDocument();
  });

  it('loads folders on mount', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/folders')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
      expect(screen.getByText('Test Folder 2')).toBeInTheDocument();
    });
  });

  it('loads assets when folder is selected', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
    });

    // Click on a folder
    fireEvent.click(screen.getByText('Test Folder 1'));

    // Wait for assets to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/assets?folder_id=folder-1')
      );
    });
  });

  it('displays egress monitoring metrics', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/\d+\.?\d*MB/)).toBeInTheDocument(); // Egress display
    });
  });

  it('handles search with debouncing', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search photos...');

    // Type in search
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    // Should show debouncing indicator
    expect(searchInput.value).toBe('test search');
  });

  it('handles photo selection', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Wait for folders and select one
    await waitFor(() => {
      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Folder 1'));

    // Wait for assets to potentially load and UI to update
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
  });

  it('shows error handling', async () => {
    // Mock fetch to return error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    });
  });

  it('handles view mode switching', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Should have both grid and list view buttons
    await waitFor(() => {
      const gridButton = screen.getByRole('tab', { name: '' }); // Grid icon
      expect(gridButton).toBeInTheDocument();
    });
  });

  it('tracks egress usage properly', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Wait for API calls
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should show egress metrics in the UI
    await waitFor(() => {
      expect(screen.getByText('Data Usage')).toBeInTheDocument();
    });
  });

  it('handles cache refresh', async () => {
    const { toast } = await import('sonner');

    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Find and click refresh button
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Clear cache and refresh data');
      fireEvent.click(refreshButton);
    });

    expect(toast.info).toHaveBeenCalledWith('Cache cleared and data refreshed');
  });

  it('disables upload when no folder selected', () => {
    render(
      <TestWrapper>
        <PhotoAdmin enableUpload={true} />
      </TestWrapper>
    );

    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });

  it('handles bulk operations correctly', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin enableBulkOperations={true} />
      </TestWrapper>
    );

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByText('Test Folder 1')).toBeInTheDocument();
    });

    // Select a folder to enable bulk operations UI
    fireEvent.click(screen.getByText('Test Folder 1'));

    // Should show selection controls
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
  });
});

describe('PhotoAdmin Egress Optimization', () => {
  it('limits API request payload size', async () => {
    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50') // Should enforce limits
      );
    });
  });

  it('implements proper pagination', async () => {
    const mockInfiniteResponse = {
      ...mockAssetsResponse,
      hasMore: true,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInfiniteResponse),
    });

    render(
      <TestWrapper>
        <PhotoAdmin />
      </TestWrapper>
    );

    // Select folder to trigger asset loading
    await waitFor(() => {
      fireEvent.click(screen.getByText('Test Folder 1'));
    });

    // Should implement infinite scroll properly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/offset=0.*limit=50/)
      );
    });
  });
});
