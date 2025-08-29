/**
 * Test suite for FolderTree deletion functionality
 *
 * Tests the secure folder deletion feature with:
 * - Proper confirmation modal
 * - System folder protection
 * - Content movement handling
 * - Error handling and feedback
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FolderTree } from '@/components/admin/FolderTree';
import { toast } from 'sonner';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = fetch as any;

describe('FolderTree Deletion', () => {
  let queryClient: QueryClient;
  const mockFolders = [
    {
      id: 'folder-1',
      name: 'Test Folder',
      parent_id: null,
      event_id: null,
      path: '/test-folder',
      depth: 0,
      photo_count: 5,
      child_folder_count: 0,
    },
    {
      id: 'folder-2',
      name: 'General',
      parent_id: null,
      event_id: null,
      path: '/general',
      depth: 0,
      photo_count: 0,
      child_folder_count: 0,
    },
    {
      id: 'folder-3',
      name: 'Family Photos',
      parent_id: null,
      event_id: null,
      path: '/family-photos',
      depth: 0,
      photo_count: 15,
      child_folder_count: 2,
    },
  ];

  const renderFolderTree = (folders = mockFolders) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FolderTree
          folders={folders}
          selectedFolderId={null}
          onFolderSelect={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockFetch.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Delete Button Visibility', () => {
    it('should show delete option in dropdown menu', async () => {
      renderFolderTree();

      // Find the first folder's actions menu
      const actionsButtons = screen.getAllByRole('button');
      const moreButton = actionsButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('h-3')
      );

      expect(moreButton).toBeDefined();

      // Click actions menu
      if (moreButton) {
        await userEvent.click(moreButton);

        // Should show delete option
        await waitFor(() => {
          expect(screen.getByText('Delete Folder')).toBeInTheDocument();
        });

        // Delete option should have red styling
        const deleteItem = screen
          .getByText('Delete Folder')
          .closest('[role="menuitem"]');
        expect(deleteItem).toHaveClass('text-red-600');
      }
    });

    it('should show trash icon in delete menu item', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const moreButton = actionsButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('h-3')
      );

      if (moreButton) {
        await userEvent.click(moreButton);
        await waitFor(() => {
          const deleteItem = screen.getByText('Delete Folder');
          expect(deleteItem.previousElementSibling).toBeTruthy(); // Trash icon
        });
      }
    });
  });

  describe('System Folder Protection', () => {
    it('should prevent deletion of General folder', async () => {
      renderFolderTree();

      // Try to delete General folder
      const actionsButtons = screen.getAllByRole('button');
      // Find the actions button for General folder (second folder)
      const generalActionButton = actionsButtons[2]; // Account for expand buttons

      await userEvent.click(generalActionButton);
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Folder');
        fireEvent.click(deleteButton);
      });

      // Should show error for system folder
      expect(toast.error).toHaveBeenCalledWith(
        'System folders cannot be deleted'
      );
    });

    it('should allow deletion of custom folders', async () => {
      // Mock API responses for deletion
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              folder: { id: 'folder-1', photo_count: 5, child_folder_count: 0 },
            }),
        } as Response) // GET folder details
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response); // DELETE request

      renderFolderTree();

      // Click actions for Test Folder (first folder)
      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1]; // First folder actions

      await userEvent.click(testFolderActionButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Folder');
        fireEvent.click(deleteButton);
      });

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('Delete Folder?')).toBeInTheDocument();
        expect(screen.getByText('"Test Folder"')).toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Modal', () => {
    beforeEach(() => {
      // Mock folder details API
      mockFetch.mockImplementation((url) => {
        if (
          typeof url === 'string' &&
          url.includes('/api/admin/folders/folder-1')
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                folder: {
                  id: 'folder-1',
                  name: 'Test Folder',
                  photo_count: 5,
                  child_folder_count: 0,
                },
              }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      });
    });

    it('should show folder name in confirmation dialog', async () => {
      renderFolderTree();

      // Trigger delete for Test Folder
      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      await waitFor(() => {
        expect(screen.getByText('Delete Folder?')).toBeInTheDocument();
        expect(screen.getByText('"Test Folder"')).toBeInTheDocument();
      });
    });

    it('should show photo count warning', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      await waitFor(() => {
        expect(screen.getByText(/5.*photos will be moved/)).toBeInTheDocument();
      });
    });

    it('should show warning that action cannot be undone', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      await waitFor(() => {
        expect(
          screen.getByText('This action cannot be undone')
        ).toBeInTheDocument();
      });
    });

    it('should have Cancel and Delete buttons', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Delete Folder' })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Delete Operation', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              folder: { id: 'folder-1', photo_count: 5, child_folder_count: 0 },
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
    });

    it('should call delete API with correct parameters', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      // Wait for modal and confirm deletion
      await waitFor(() => {
        const deleteButton = screen.getByRole('button', {
          name: 'Delete Folder',
        });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/folders/folder-1?moveContentsTo=null',
          { method: 'DELETE' }
        );
      });
    });

    it('should show success toast on successful deletion', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', {
          name: 'Delete Folder',
        });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Folder "Test Folder" deleted successfully'
        );
      });
    });

    it('should close modal after successful deletion', async () => {
      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete Folder',
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Folder?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on API failure', async () => {
      // Mock folder details success, but delete failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              folder: { id: 'folder-1', photo_count: 5, child_folder_count: 0 },
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () =>
            Promise.resolve({ error: 'Folder contains protected items' }),
        } as Response);

      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete Folder',
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Folder contains protected items'
        );
      });
    });

    it('should keep modal open on error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              folder: { id: 'folder-1', photo_count: 5, child_folder_count: 0 },
            }),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete Folder',
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
        expect(screen.getByText('Delete Folder?')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during deletion', async () => {
      // Mock slow API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              folder: { id: 'folder-1', photo_count: 5, child_folder_count: 0 },
            }),
        } as Response)
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true }),
                  } as Response),
                1000
              )
            )
        );

      renderFolderTree();

      const actionsButtons = screen.getAllByRole('button');
      const testFolderActionButton = actionsButtons[1];

      await userEvent.click(testFolderActionButton);
      await userEvent.click(screen.getByText('Delete Folder'));

      const deleteButton = await screen.findByRole('button', {
        name: 'Delete Folder',
      });
      fireEvent.click(deleteButton);

      // Should show loading state
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();
    });
  });
});
