/**
 * COURSE MANAGEMENT SERVICE TESTS
 * 
 * Tests for course management and domain separation logic
 * Covers: Course CRUD, membership management, folder linking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { CourseManagementService } from '../../lib/services/course-management.service';

// Mock Supabase
vi.mock('@supabase/supabase-js');

const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
};

const mockFrom = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn()
};

// Setup chainable mocks
mockFrom.insert.mockReturnThis();
mockFrom.select.mockReturnThis();
mockFrom.update.mockReturnThis();
mockFrom.delete.mockReturnThis();
mockFrom.eq.mockReturnThis();
mockFrom.single.mockReturnThis();
mockFrom.order.mockReturnThis();

mockSupabaseClient.from.mockReturnValue(mockFrom);

vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

describe('CourseManagementService', () => {
  let service: CourseManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseManagementService();
  });

  describe('Course Creation', () => {
    it('should create new course successfully', async () => {
      // First check if course exists (should return null)
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      // Then create course
      mockFrom.single.mockResolvedValueOnce({
        data: {
          id: 'course-123',
          event_id: 'event-456',
          name: 'Mathematics 5A',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      const result = await service.createCourse('event-456', 'Mathematics 5A');

      expect(result.id).toBe('course-123');
      expect(result.eventId).toBe('event-456');
      expect(result.name).toBe('Mathematics 5A');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        event_id: 'event-456',
        name: 'Mathematics 5A'
      });
    });

    it('should throw error if course name already exists', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'existing-course' },
        error: null
      });

      await expect(service.createCourse('event-456', 'Existing Course'))
        .rejects.toThrow('Course "Existing Course" already exists in this event');
    });

    it('should trim course name', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      mockFrom.single.mockResolvedValueOnce({
        data: {
          id: 'course-123',
          event_id: 'event-456',
          name: 'Trimmed Course',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      await service.createCourse('event-456', '  Trimmed Course  ');

      expect(mockFrom.insert).toHaveBeenCalledWith({
        event_id: 'event-456',
        name: 'Trimmed Course'
      });
    });
  });

  describe('Course Retrieval', () => {
    it('should get event courses with RPC function', async () => {
      const mockRpcData = [
        {
          course_id: 'course-1',
          course_name: 'Math 5A',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          member_count: '15',
          folder_count: '3'
        },
        {
          course_id: 'course-2',
          course_name: 'Science 5B',
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          member_count: '12',
          folder_count: '2'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockRpcData,
        error: null
      });

      const result = await service.getEventCourses('event-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('course-1');
      expect(result[0].name).toBe('Math 5A');
      expect(result[0].memberCount).toBe(15);
      expect(result[0].folderCount).toBe(3);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_event_courses', {
        p_event_id: 'event-123'
      });
    });

    it('should fallback to basic query if RPC fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function not available' }
      });

      const mockBasicData = [
        {
          id: 'course-1',
          event_id: 'event-123',
          name: 'Math 5A',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockFrom.order.mockResolvedValueOnce({
        data: mockBasicData,
        error: null
      });

      const result = await service.getEventCourses('event-123');

      expect(result).toHaveLength(1);
      expect(result[0].memberCount).toBe(0); // fallback value
      expect(result[0].folderCount).toBe(0);
    });

    it('should get single course with details', async () => {
      const mockCourseData = {
        id: 'course-123',
        event_id: 'event-456',
        name: 'Math 5A',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockCourseData,
        error: null
      });

      // Mock member count query
      const mockMemberCount = { count: 15 };
      mockFrom.eq.mockResolvedValueOnce(mockMemberCount);

      // Mock folder count query  
      const mockFolderCount = { count: 3 };
      mockFrom.eq.mockResolvedValueOnce(mockFolderCount);

      const result = await service.getCourse('course-123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('course-123');
      expect(result!.memberCount).toBe(15);
      expect(result!.folderCount).toBe(3);
    });
  });

  describe('Course Updates', () => {
    it('should update course name', async () => {
      const mockUpdatedData = {
        id: 'course-123',
        event_id: 'event-456',
        name: 'Updated Math 5A',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z'
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockUpdatedData,
        error: null
      });

      const result = await service.updateCourse('course-123', { name: 'Updated Math 5A' });

      expect(result.name).toBe('Updated Math 5A');
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Math 5A',
          updated_at: expect.any(String)
        })
      );
    });

    it('should delete course', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await service.deleteCourse('course-123');

      expect(result).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'course-123');
    });
  });

  describe('Course Membership', () => {
    it('should add member to course', async () => {
      // Check if already exists (should return null)
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      // Insert new member
      mockFrom.single.mockResolvedValueOnce({
        data: {
          course_id: 'course-123',
          subject_id: 'subject-456',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      const result = await service.addMemberToCourse('course-123', 'subject-456');

      expect(result.courseId).toBe('course-123');
      expect(result.subjectId).toBe('subject-456');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        course_id: 'course-123',
        subject_id: 'subject-456'
      });
    });

    it('should return existing member if already enrolled', async () => {
      const existingMember = {
        course_id: 'course-123',
        subject_id: 'subject-456',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      mockFrom.single.mockResolvedValueOnce({
        data: existingMember,
        error: null
      });

      const result = await service.addMemberToCourse('course-123', 'subject-456');

      expect(result.courseId).toBe('course-123');
      expect(result.subjectId).toBe('subject-456');
      expect(mockFrom.insert).not.toHaveBeenCalled();
    });

    it('should remove member from course', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await service.removeMemberFromCourse('course-123', 'subject-456');

      expect(result).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
    });

    it('should get course members with RPC', async () => {
      const mockMembersData = [
        {
          subject_id: 'subject-1',
          first_name: 'John',
          last_name: 'Smith',
          family_name: 'Smith Family',
          photo_count: '5'
        },
        {
          subject_id: 'subject-2',
          first_name: 'Jane',
          last_name: 'Doe',
          family_name: 'Doe Family',
          photo_count: '3'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockMembersData,
        error: null
      });

      const result = await service.getCourseMembers('course-123');

      expect(result).toHaveLength(2);
      expect(result[0].subject!.firstName).toBe('John');
      expect(result[0].subject!.familyName).toBe('Smith Family');
    });

    it('should get family courses', async () => {
      const mockCoursesData = [
        {
          courses: {
            id: 'course-1',
            event_id: 'event-123',
            name: 'Math 5A',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          }
        }
      ];

      mockFrom.eq.mockResolvedValueOnce({
        data: mockCoursesData,
        error: null
      });

      const result = await service.getFamilyCourses('subject-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Math 5A');
    });
  });

  describe('Folder Management', () => {
    it('should link folder to course', async () => {
      // Check if already linked (should return null)
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      // Create link
      mockFrom.single.mockResolvedValueOnce({
        data: {
          folder_id: 'folder-123',
          course_id: 'course-456',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      const result = await service.linkFolderToCourse('folder-123', 'course-456');

      expect(result.folderId).toBe('folder-123');
      expect(result.courseId).toBe('course-456');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        folder_id: 'folder-123',
        course_id: 'course-456'
      });
    });

    it('should return existing link if already exists', async () => {
      const existingLink = {
        folder_id: 'folder-123',
        course_id: 'course-456',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      mockFrom.single.mockResolvedValueOnce({
        data: existingLink,
        error: null
      });

      const result = await service.linkFolderToCourse('folder-123', 'course-456');

      expect(result.folderId).toBe('folder-123');
      expect(mockFrom.insert).not.toHaveBeenCalled();
    });

    it('should unlink folder from course', async () => {
      mockFrom.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await service.unlinkFolderFromCourse('folder-123', 'course-456');

      expect(result).toBe(true);
    });

    it('should get course folders', async () => {
      const mockFoldersData = [
        {
          folder_id: 'folder-1',
          course_id: 'course-123',
          created_at: '2024-01-01T00:00:00.000Z',
          folders: {
            id: 'folder-1',
            name: 'Class Photos',
            photo_count: 25,
            is_published: true
          }
        }
      ];

      mockFrom.eq.mockResolvedValueOnce({
        data: mockFoldersData,
        error: null
      });

      const result = await service.getCourseFolders('course-123');

      expect(result).toHaveLength(1);
      expect(result[0].folder!.name).toBe('Class Photos');
      expect(result[0].folder!.photoCount).toBe(25);
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk enroll families', async () => {
      // Mock successful enrollments
      mockFrom.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
        .mockResolvedValueOnce({
          data: { course_id: 'course-123', subject_id: 'subject-1', created_at: '2024-01-01T00:00:00.000Z' },
          error: null
        })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
        .mockResolvedValueOnce({
          data: { course_id: 'course-123', subject_id: 'subject-2', created_at: '2024-01-01T00:00:00.000Z' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { course_id: 'course-123', subject_id: 'subject-3', created_at: '2024-01-01T00:00:00.000Z' },
          error: null
        }); // Already exists

      const result = await service.bulkEnrollFamilies('course-123', [
        'subject-1', 'subject-2', 'subject-3'
      ]);

      expect(result.enrolled).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it('should bulk link folders', async () => {
      // Mock successful links
      mockFrom.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
        .mockResolvedValueOnce({
          data: { folder_id: 'folder-1', course_id: 'course-123', created_at: '2024-01-01T00:00:00.000Z' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { folder_id: 'folder-2', course_id: 'course-123', created_at: '2024-01-01T00:00:00.000Z' },
          error: null
        }); // Already exists

      const result = await service.bulkLinkFolders('course-123', [
        'folder-1', 'folder-2'
      ]);

      expect(result.linked).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('Course Statistics', () => {
    it('should calculate course statistics', async () => {
      const mockCoursesData = [
        {
          course_id: 'course-1',
          course_name: 'Math 5A',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          member_count: '15',
          folder_count: '3'
        },
        {
          course_id: 'course-2',
          course_name: 'Science 5B',
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          member_count: '10',
          folder_count: '2'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockCoursesData,
        error: null
      });

      const result = await service.getCourseStats('event-123');

      expect(result.totalCourses).toBe(2);
      expect(result.totalMembers).toBe(25);
      expect(result.totalFolders).toBe(5);
      expect(result.averageMembersPerCourse).toBe(12.5);
      expect(result.averageFoldersPerCourse).toBe(2.5);
    });

    it('should handle empty event', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await service.getCourseStats('empty-event');

      expect(result.totalCourses).toBe(0);
      expect(result.averageMembersPerCourse).toBe(0);
      expect(result.averageFoldersPerCourse).toBe(0);
    });
  });
});