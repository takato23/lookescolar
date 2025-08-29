/**
 * COURSE MANAGEMENT SERVICE - Domain Separation Logic
 * 
 * Manages courses, course memberships, and folder assignments
 * Implements domain separation: Courses ≠ Subjects (families)
 * Features: Course creation, family enrollment, folder linking
 */

import { createClient } from '@supabase/supabase-js';

// Types for course management
export interface Course {
  id: string;
  eventId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  memberCount: number;
  folderCount: number;
}

export interface CourseMember {
  courseId: string;
  subjectId: string;
  createdAt: Date;
  // Related data
  subject?: {
    id: string;
    firstName: string;
    lastName: string;
    familyName?: string;
  };
}

export interface FolderCourseAssignment {
  folderId: string;
  courseId: string;
  createdAt: Date;
  // Related data
  folder?: {
    id: string;
    name: string;
    photoCount: number;
    isPublished: boolean;
  };
}

export interface CourseStats {
  totalCourses: number;
  totalMembers: number;
  totalFolders: number;
  averageMembersPerCourse: number;
  averageFoldersPerCourse: number;
}

export class CourseManagementService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Create a new course within an event
   */
  async createCourse(eventId: string, name: string): Promise<Course> {
    // Check if course name already exists in event
    const { data: existing } = await this.supabase
      .from('courses')
      .select('id')
      .eq('event_id', eventId)
      .eq('name', name)
      .single();

    if (existing) {
      throw new Error(`Course "${name}" already exists in this event`);
    }

    const { data, error } = await this.supabase
      .from('courses')
      .insert({
        event_id: eventId,
        name: name.trim()
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }

    return this.mapCourseData(data);
  }

  /**
   * Get all courses for an event with statistics
   */
  async getEventCourses(eventId: string): Promise<Course[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_event_courses', { p_event_id: eventId });

      if (error) {
        throw new Error(`Failed to get event courses: ${error.message}`);
      }

      return (data || []).map((course: any) => ({
        id: course.course_id,
        eventId,
        name: course.course_name,
        createdAt: new Date(course.created_at),
        updatedAt: new Date(course.updated_at),
        memberCount: parseInt(course.member_count) || 0,
        folderCount: parseInt(course.folder_count) || 0
      }));
    } catch (error) {
      // Fallback to basic query if RPC function not available
      console.warn('Using fallback query for courses:', error);
      
      const { data, error: queryError } = await this.supabase
        .from('courses')
        .select(`
          id,
          event_id,
          name,
          created_at,
          updated_at
        `)
        .eq('event_id', eventId)
        .order('name');

      if (queryError) {
        throw new Error(`Failed to get courses: ${queryError.message}`);
      }

      return (data || []).map(course => ({
        ...this.mapCourseData(course),
        memberCount: 0, // Will be computed separately if needed
        folderCount: 0
      }));
    }
  }

  /**
   * Get course by ID with full details
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const { data, error } = await this.supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !data) {
      return null;
    }

    // Get member and folder counts
    const [memberCount, folderCount] = await Promise.all([
      this.getMemberCount(courseId),
      this.getFolderCount(courseId)
    ]);

    return {
      ...this.mapCourseData(data),
      memberCount,
      folderCount
    };
  }

  /**
   * Update course name
   */
  async updateCourse(courseId: string, updates: { name?: string }): Promise<Course> {
    const updateData: any = {};
    if (updates.name) {
      updateData.name = updates.name.trim();
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update course: ${error.message}`);
    }

    return this.mapCourseData(data);
  }

  /**
   * Delete course (cascades to members and folder assignments)
   */
  async deleteCourse(courseId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    return !error;
  }

  /**
   * Add family to course (enroll family)
   */
  async addMemberToCourse(courseId: string, subjectId: string): Promise<CourseMember> {
    // Check if already a member
    const { data: existing } = await this.supabase
      .from('course_members')
      .select('*')
      .eq('course_id', courseId)
      .eq('subject_id', subjectId)
      .single();

    if (existing) {
      return this.mapCourseMemberData(existing);
    }

    const { data, error } = await this.supabase
      .from('course_members')
      .insert({
        course_id: courseId,
        subject_id: subjectId
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to add member to course: ${error.message}`);
    }

    return this.mapCourseMemberData(data);
  }

  /**
   * Remove family from course
   */
  async removeMemberFromCourse(courseId: string, subjectId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('course_members')
      .delete()
      .eq('course_id', courseId)
      .eq('subject_id', subjectId);

    return !error;
  }

  /**
   * Get all members of a course
   */
  async getCourseMembers(courseId: string): Promise<CourseMember[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_course_families', { p_course_id: courseId });

      if (error) {
        throw new Error(`Failed to get course members: ${error.message}`);
      }

      return (data || []).map((member: any) => ({
        courseId,
        subjectId: member.subject_id,
        createdAt: new Date(), // Not available in RPC result
        subject: {
          id: member.subject_id,
          firstName: member.first_name,
          lastName: member.last_name,
          familyName: member.family_name
        }
      }));
    } catch (error) {
      // Fallback to basic query
      const { data, error: queryError } = await this.supabase
        .from('course_members')
        .select(`
          *,
          subjects:subject_id (
            id,
            first_name,
            last_name,
            family_name
          )
        `)
        .eq('course_id', courseId);

      if (queryError) {
        throw new Error(`Failed to get course members: ${queryError.message}`);
      }

      return (data || []).map(member => ({
        courseId: member.course_id,
        subjectId: member.subject_id,
        createdAt: new Date(member.created_at),
        subject: member.subjects ? {
          id: member.subjects.id,
          firstName: member.subjects.first_name,
          lastName: member.subjects.last_name,
          familyName: member.subjects.family_name
        } : undefined
      }));
    }
  }

  /**
   * Get courses that a family belongs to
   */
  async getFamilyCourses(subjectId: string): Promise<Course[]> {
    const { data, error } = await this.supabase
      .from('course_members')
      .select(`
        courses (
          id,
          event_id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('subject_id', subjectId);

    if (error) {
      throw new Error(`Failed to get family courses: ${error.message}`);
    }

    return (data || [])
      .map((item: any) => item.courses)
      .filter(Boolean)
      .map(course => this.mapCourseData(course));
  }

  /**
   * Link folder to course (grants course access to folder)
   */
  async linkFolderToCourse(folderId: string, courseId: string): Promise<FolderCourseAssignment> {
    // Check if already linked
    const { data: existing } = await this.supabase
      .from('folder_courses')
      .select('*')
      .eq('folder_id', folderId)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      return this.mapFolderCourseData(existing);
    }

    const { data, error } = await this.supabase
      .from('folder_courses')
      .insert({
        folder_id: folderId,
        course_id: courseId
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to link folder to course: ${error.message}`);
    }

    return this.mapFolderCourseData(data);
  }

  /**
   * Unlink folder from course
   */
  async unlinkFolderFromCourse(folderId: string, courseId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('folder_courses')
      .delete()
      .eq('folder_id', folderId)
      .eq('course_id', courseId);

    return !error;
  }

  /**
   * Get folders linked to a course
   */
  async getCourseFolders(courseId: string): Promise<FolderCourseAssignment[]> {
    const { data, error } = await this.supabase
      .from('folder_courses')
      .select(`
        *,
        folders (
          id,
          name,
          photo_count,
          is_published
        )
      `)
      .eq('course_id', courseId);

    if (error) {
      throw new Error(`Failed to get course folders: ${error.message}`);
    }

    return (data || []).map(assignment => ({
      folderId: assignment.folder_id,
      courseId: assignment.course_id,
      createdAt: new Date(assignment.created_at),
      folder: assignment.folders ? {
        id: assignment.folders.id,
        name: assignment.folders.name,
        photoCount: assignment.folders.photo_count,
        isPublished: assignment.folders.is_published
      } : undefined
    }));
  }

  /**
   * Get courses that have access to a folder
   */
  async getFolderCourses(folderId: string): Promise<Course[]> {
    const { data, error } = await this.supabase
      .from('folder_courses')
      .select(`
        courses (
          id,
          event_id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('folder_id', folderId);

    if (error) {
      throw new Error(`Failed to get folder courses: ${error.message}`);
    }

    return (data || [])
      .map((item: any) => item.courses)
      .filter(Boolean)
      .map(course => this.mapCourseData(course));
  }

  /**
   * Bulk enroll families to course
   */
  async bulkEnrollFamilies(courseId: string, subjectIds: string[]): Promise<{ enrolled: number; skipped: number }> {
    let enrolled = 0;
    let skipped = 0;

    for (const subjectId of subjectIds) {
      try {
        await this.addMemberToCourse(courseId, subjectId);
        enrolled++;
      } catch (error) {
        // Probably already enrolled
        skipped++;
      }
    }

    return { enrolled, skipped };
  }

  /**
   * Bulk link folders to course
   */
  async bulkLinkFolders(courseId: string, folderIds: string[]): Promise<{ linked: number; skipped: number }> {
    let linked = 0;
    let skipped = 0;

    for (const folderId of folderIds) {
      try {
        await this.linkFolderToCourse(folderId, courseId);
        linked++;
      } catch (error) {
        // Probably already linked
        skipped++;
      }
    }

    return { linked, skipped };
  }

  /**
   * Get course statistics for an event
   */
  async getCourseStats(eventId: string): Promise<CourseStats> {
    const courses = await this.getEventCourses(eventId);
    
    const totalMembers = courses.reduce((sum, course) => sum + course.memberCount, 0);
    const totalFolders = courses.reduce((sum, course) => sum + course.folderCount, 0);
    
    return {
      totalCourses: courses.length,
      totalMembers,
      totalFolders,
      averageMembersPerCourse: courses.length > 0 ? totalMembers / courses.length : 0,
      averageFoldersPerCourse: courses.length > 0 ? totalFolders / courses.length : 0
    };
  }

  // Helper methods
  
  private async getMemberCount(courseId: string): Promise<number> {
    const { count } = await this.supabase
      .from('course_members')
      .select('*', { count: 'exact' })
      .eq('course_id', courseId);

    return count || 0;
  }

  private async getFolderCount(courseId: string): Promise<number> {
    const { count } = await this.supabase
      .from('folder_courses')
      .select('*', { count: 'exact' })
      .eq('course_id', courseId);

    return count || 0;
  }

  private mapCourseData(data: any): Course {
    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      memberCount: 0, // Will be set separately
      folderCount: 0  // Will be set separately
    };
  }

  private mapCourseMemberData(data: any): CourseMember {
    return {
      courseId: data.course_id,
      subjectId: data.subject_id,
      createdAt: new Date(data.created_at)
    };
  }

  private mapFolderCourseData(data: any): FolderCourseAssignment {
    return {
      folderId: data.folder_id,
      courseId: data.course_id,
      createdAt: new Date(data.created_at)
    };
  }
}

// Singleton instance
export const courseManagementService = new CourseManagementService();