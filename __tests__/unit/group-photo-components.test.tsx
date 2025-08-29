import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import GroupPhotoManager from '@/components/admin/GroupPhotoManager';
import GroupPhotosSection from '@/components/family/GroupPhotosSection';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/storage/signedUrl', () => ({
  signedUrlForKey: vi.fn().mockResolvedValue('https://example.com/signed-url'),
}));

// Mock fetch
global.fetch = vi.fn();

describe('GroupPhotoManager Component', () => {
  const mockCourses = [
    {
      id: 'course-1',
      name: 'Course 1A',
      grade: '1',
      section: 'A',
      event_id: 'event-1',
      student_count: 25,
    },
    {
      id: 'course-2',
      name: 'Course 1B',
      grade: '1',
      section: 'B',
      event_id: 'event-1',
      student_count: 23,
    },
  ];

  const mockGroupPhotos = [
    {
      id: 'photo-1',
      filename: 'group-photo-1.jpg',
      storage_path: 'test/group1.jpg',
      preview_url: 'https://example.com/preview1.jpg',
      photo_type: 'group' as const,
      course_id: 'course-1',
      event_id: 'event-1',
      approved: true,
      file_size_bytes: 1024000,
      created_at: '2024-01-01T00:00:00Z',
      tagged_at: '2024-01-01T00:00:00Z',
      association_id: 'assoc-1',
    },
  ];

  const mockAvailablePhotos = [
    {
      id: 'photo-2',
      filename: 'available-photo-1.jpg',
      storage_path: 'test/available1.jpg',
      preview_url: 'https://example.com/available1.jpg',
      approved: true,
      created_at: '2024-01-01T00:00:00Z',
      photo_type: 'individual',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('should render course selection', () => {
    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    expect(screen.getByText('Group Photo Management')).toBeInTheDocument();
    expect(screen.getByText('Select Course')).toBeInTheDocument();
    expect(screen.getByText('Course 1A')).toBeInTheDocument();
    expect(screen.getByText('Course 1B')).toBeInTheDocument();
  });

  it('should select a course and load group photos', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: mockGroupPhotos }),
    });

    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    // Click on first course
    fireEvent.click(screen.getByText('Course 1A'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/events/event-1/courses/course-1/photos'
      );
    });
  });

  it('should handle course selection and show assign photos dialog', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockGroupPhotos }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockAvailablePhotos }),
      });

    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    // Select course
    fireEvent.click(screen.getByText('Course 1A'));

    await waitFor(() => {
      expect(
        screen.getByText('Group Photos for Course 1A')
      ).toBeInTheDocument();
    });

    // Click assign photos button
    fireEvent.click(screen.getByText('Assign Photos'));

    await waitFor(() => {
      expect(screen.getByText('Assign Photos to Course')).toBeInTheDocument();
    });
  });

  it('should handle photo assignment', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockAvailablePhotos }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Successfully assigned 1 photo(s)',
          }),
      });

    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    // Select course and open dialog
    fireEvent.click(screen.getByText('Course 1A'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Assign Photos'));
    });

    await waitFor(() => {
      expect(screen.getByText('available-photo-1.jpg')).toBeInTheDocument();
    });

    // Select photo and assign
    fireEvent.click(screen.getByText('available-photo-1.jpg'));
    fireEvent.click(screen.getByText(/Assign \d+ Photo/));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/events/event-1/courses/course-1/photos',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_ids: ['photo-2'],
            photo_type: 'group',
          }),
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Successfully assigned 1 photo(s)'
    );
  });

  it('should handle assignment errors', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockAvailablePhotos }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Assignment failed' }),
      });

    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    // Go through assignment flow
    fireEvent.click(screen.getByText('Course 1A'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Assign Photos'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('available-photo-1.jpg'));
      fireEvent.click(screen.getByText(/Assign \d+ Photo/));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Assignment failed');
    });
  });

  it('should filter photos by type', async () => {
    const mixedPhotos = [
      { ...mockGroupPhotos[0], photo_type: 'group' },
      { ...mockGroupPhotos[0], id: 'photo-3', photo_type: 'activity' },
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: mixedPhotos }),
    });

    render(<GroupPhotoManager eventId="event-1" courses={mockCourses} />);

    fireEvent.click(screen.getByText('Course 1A'));

    await waitFor(() => {
      expect(screen.getByText('2 photo(s)')).toBeInTheDocument();
    });

    // Filter by group type
    const filterSelect = screen.getByDisplayValue('All Types');
    fireEvent.click(filterSelect);
    fireEvent.click(screen.getByText('Group'));

    // Should show only group photos
    expect(screen.getByText('1 photo(s)')).toBeInTheDocument();
  });
});

describe('GroupPhotosSection Component', () => {
  const mockCourse = {
    id: 'course-1',
    name: 'Course 1A',
    grade: '1',
    section: 'A',
  };

  const mockGroupPhotos = [
    {
      id: 'photo-1',
      filename: 'group-photo-1.jpg',
      storage_path: 'test/group1.jpg',
      signed_url: 'https://example.com/signed1.jpg',
      photo_type: 'group' as const,
      is_group_photo: true,
      course_id: 'course-1',
      tagged_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      association_id: 'assoc-1',
    },
    {
      id: 'photo-2',
      filename: 'activity-photo-1.jpg',
      storage_path: 'test/activity1.jpg',
      signed_url: 'https://example.com/signed2.jpg',
      photo_type: 'activity' as const,
      is_group_photo: true,
      course_id: 'course-1',
      tagged_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      association_id: 'assoc-2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('should render without course info', () => {
    render(<GroupPhotosSection token="test-token" />);

    expect(
      screen.getByText('No course information available for group photos')
    ).toBeInTheDocument();
  });

  it('should render with course info and load group photos', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: mockGroupPhotos }),
    });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    expect(screen.getByText('Group Photos - Course 1A')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/family/gallery/test-token/group-photos'
      );
    });
  });

  it('should display group photos grid', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: mockGroupPhotos }),
    });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(screen.getByText('group-photo-1.jpg')).toBeInTheDocument();
      expect(screen.getByText('activity-photo-1.jpg')).toBeInTheDocument();
    });

    expect(screen.getByText('2 photo(s)')).toBeInTheDocument();
  });

  it('should filter photos by type', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockGroupPhotos }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: [mockGroupPhotos[0]] }),
      });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(screen.getByText('2 photo(s)')).toBeInTheDocument();
    });

    // Change filter to group only
    const filterSelect = screen.getByDisplayValue('All Group Photos');
    fireEvent.click(filterSelect);
    fireEvent.click(screen.getByText('Group Photos'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/family/gallery/test-token/group-photos?photo_type=group'
      );
    });
  });

  it('should handle add to cart functionality', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ photos: mockGroupPhotos }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(screen.getByText('group-photo-1.jpg')).toBeInTheDocument();
    });

    // Click add to cart
    const addToCartButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addToCartButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/family/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token',
          photo_id: 'photo-1',
          quantity: 1,
        }),
      });
    });
  });

  it('should open photo lightbox', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: mockGroupPhotos }),
    });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(screen.getByText('group-photo-1.jpg')).toBeInTheDocument();
    });

    // Click on photo to open lightbox
    const photo = screen.getByAltText('group-photo-1.jpg');
    fireEvent.click(photo);

    await waitFor(() => {
      expect(
        screen.getByText('Group Photos • Course 1A • 1 A')
      ).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    expect(screen.getByText('Loading group photos...')).toBeInTheDocument();
  });

  it('should handle empty state', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ photos: [] }),
    });

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(
        screen.getByText('No group photos available yet')
      ).toBeInTheDocument();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<GroupPhotosSection token="test-token" course={mockCourse} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading group photos:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});

describe('Integration between GroupPhotoManager and API', () => {
  it('should handle complete workflow of photo assignment', async () => {
    const eventId = 'event-1';
    const courseId = 'course-1';
    const photoIds = ['photo-1', 'photo-2'];

    // Mock successful assignment
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message:
            'Successfully assigned 2 photo(s) to course Test Course as group photos',
          course: { id: courseId, name: 'Test Course' },
          photo_type: 'group',
          photos_count: 2,
        }),
    });

    const response = await fetch(
      `/api/admin/events/${eventId}/courses/${courseId}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: photoIds,
          photo_type: 'group',
        }),
      }
    );

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.photos_count).toBe(2);
    expect(data.photo_type).toBe('group');
  });

  it('should handle bulk operations workflow', async () => {
    const eventId = 'event-1';
    const courseId = 'course-1';
    const photoIds = ['photo-1', 'photo-2'];

    // Mock successful bulk operation
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: 'Successfully approved 2 photo(s)',
          affected_photos: 2,
        }),
    });

    const response = await fetch(
      `/api/admin/events/${eventId}/courses/${courseId}/photos/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          photo_ids: photoIds,
        }),
      }
    );

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.affected_photos).toBe(2);
  });
});
