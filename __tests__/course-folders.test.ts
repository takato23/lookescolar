import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCourseFolder, getCoursesInFolder } from '../lib/courses/folders';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: () => mockSupabase,
}));

describe('Course Folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a course folder', async () => {
    const mockFolder = {
      id: 'folder-1',
      name: 'Test Folder',
      event_id: 'event-1',
      is_folder: true,
      active: true,
    };

    mockSupabase.single.mockResolvedValue({ data: mockFolder, error: null });

    const folder = await createCourseFolder({
      eventId: 'event-1',
      name: 'Test Folder',
      description: 'A test folder',
    });

    expect(folder).toEqual(mockFolder);
    expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      event_id: 'event-1',
      name: 'Test Folder',
      description: 'A test folder',
      is_folder: true,
      active: true,
    });
  });

  it('should get courses in a folder', async () => {
    const mockCourses = [
      { id: 'course-1', name: 'Course 1', parent_course_id: 'folder-1' },
      { id: 'course-2', name: 'Course 2', parent_course_id: 'folder-1' },
    ];

    mockSupabase.select.mockResolvedValue({ data: mockCourses, error: null });

    const courses = await getCoursesInFolder('folder-1');

    expect(courses).toEqual(mockCourses);
    expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    expect(mockSupabase.eq).toHaveBeenCalledWith('parent_course_id', 'folder-1');
  });
});