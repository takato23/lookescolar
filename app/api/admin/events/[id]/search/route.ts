import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface SearchResult {
  id: string;
  type: 'event' | 'level' | 'course' | 'student' | 'photo';
  title: string;
  subtitle?: string;
  description?: string;
  path: string[];
  metadata?: {
    photoCount?: number;
    studentCount?: number;
    courseCount?: number;
    uploadDate?: string;
    lastActivity?: string;
    tags?: string[];
  };
  score: number;
  highlighted?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params;
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '50');
    const types = searchParams.get('types')?.split(',') || [];
    const hasPhotos = searchParams.get('has_photos') === 'true';
    const approved = searchParams.get('approved') === 'true';
    const recent = searchParams.get('recent') === 'true';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        total: 0,
      });
    }

    const supabase = await createServerSupabaseServiceClient();
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Helper function to calculate relevance score
    const calculateScore = (text: string, term: string): number => {
      const lowerText = text.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (lowerText === term) score += 1.0;
      // Starts with term gets high score
      else if (lowerText.startsWith(term)) score += 0.8;
      // Contains term gets medium score
      else if (lowerText.includes(term)) score += 0.6;
      // Word boundary match gets good score
      else if (new RegExp(`\\b${term}`, 'i').test(text)) score += 0.7;

      return Math.min(score, 1.0);
    };

    // Helper function to highlight matches
    const highlightMatch = (text: string, term: string): string => {
      const regex = new RegExp(`(${term})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    // Search in event levels
    if (types.length === 0 || types.includes('level')) {
      const { data: levels } = await supabase
        .from('event_levels')
        .select(
          `
          id, name, description,
          courses:courses(count),
          students:students(count)
        `
        )
        .eq('event_id', eventId)
        .eq('active', true);

      if (levels) {
        for (const level of levels) {
          const nameScore = calculateScore(level.name, searchTerm);
          const descScore = level.description
            ? calculateScore(level.description, searchTerm)
            : 0;
          const maxScore = Math.max(nameScore, descScore);

          if (maxScore > 0) {
            // Get photo count for this level
            const { count: photoCount } = await supabase
              .from('assets')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .in(
                'id',
                supabase
                  .from('photo_students')
                  .select('photo_id')
                  .in(
                    'student_id',
                    supabase
                      .from('students')
                      .select('id')
                      .in(
                        'course_id',
                        supabase
                          .from('courses')
                          .select('id')
                          .eq('level_id', level.id)
                      )
                  )
              );

            results.push({
              id: level.id,
              type: 'level',
              title: level.name,
              subtitle: level.description || undefined,
              description: `Nivel escolar con ${level.courses?.[0]?.count || 0} cursos`,
              path: [level.name],
              metadata: {
                courseCount: level.courses?.[0]?.count || 0,
                studentCount: level.students?.[0]?.count || 0,
                photoCount: photoCount || 0,
              },
              score: maxScore,
              highlighted: {
                title:
                  nameScore > 0 ? highlightMatch(level.name, query) : undefined,
                subtitle:
                  descScore > 0 && level.description
                    ? highlightMatch(level.description, query)
                    : undefined,
              },
            });
          }
        }
      }
    }

    // Search in courses
    if (types.length === 0 || types.includes('course')) {
      const { data: courses } = await supabase
        .from('courses')
        .select(
          `
          id, name, grade, section, description,
          event_levels:event_levels(name),
          students:students(count)
        `
        )
        .eq('event_id', eventId)
        .eq('active', true);

      if (courses) {
        for (const course of courses) {
          const nameScore = calculateScore(course.name, searchTerm);
          const gradeScore = course.grade
            ? calculateScore(course.grade, searchTerm)
            : 0;
          const sectionScore = course.section
            ? calculateScore(course.section, searchTerm)
            : 0;
          const descScore = course.description
            ? calculateScore(course.description, searchTerm)
            : 0;
          const maxScore = Math.max(
            nameScore,
            gradeScore,
            sectionScore,
            descScore
          );

          if (maxScore > 0) {
            // Get photo count for this course
            const { count: photoCount } = await supabase
              .from('assets')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .in(
                'id',
                supabase
                  .from('photo_students')
                  .select('photo_id')
                  .in(
                    'student_id',
                    supabase
                      .from('students')
                      .select('id')
                      .eq('course_id', course.id)
                  )
              );

            const path = [
              course.event_levels?.name || 'Sin nivel',
              course.name,
            ].filter(Boolean);

            results.push({
              id: course.id,
              type: 'course',
              title: course.name,
              subtitle: [course.grade, course.section]
                .filter(Boolean)
                .join(' - '),
              description:
                course.description ||
                `Curso con ${course.students?.[0]?.count || 0} estudiantes`,
              path,
              metadata: {
                studentCount: course.students?.[0]?.count || 0,
                photoCount: photoCount || 0,
              },
              score: maxScore,
              highlighted: {
                title:
                  nameScore > 0
                    ? highlightMatch(course.name, query)
                    : undefined,
                subtitle:
                  gradeScore > 0 || sectionScore > 0
                    ? highlightMatch(
                        [course.grade, course.section]
                          .filter(Boolean)
                          .join(' - '),
                        query
                      )
                    : undefined,
              },
            });
          }
        }
      }
    }

    // Search in students
    if (types.length === 0 || types.includes('student')) {
      const { data: students } = await supabase
        .from('students')
        .select(
          `
          id, name, grade, section, parent_name, created_at,
          courses:courses(
            name,
            event_levels:event_levels(name)
          )
        `
        )
        .eq('event_id', eventId)
        .eq('active', true);

      if (students) {
        for (const student of students) {
          const nameScore = calculateScore(student.name, searchTerm);
          const parentScore = student.parent_name
            ? calculateScore(student.parent_name, searchTerm)
            : 0;
          const gradeScore = student.grade
            ? calculateScore(student.grade, searchTerm)
            : 0;
          const maxScore = Math.max(nameScore, parentScore, gradeScore);

          if (maxScore > 0) {
            // Get photo count for this student
            const { count: photoCount } = await supabase
              .from('photo_students')
              .select('photo_id', { count: 'exact', head: true })
              .eq('student_id', student.id);

            const path = [
              student.courses?.event_levels?.name || 'Sin nivel',
              student.courses?.name || 'Sin curso',
              student.name,
            ].filter(Boolean);

            results.push({
              id: student.id,
              type: 'student',
              title: student.name,
              subtitle: [student.grade, student.section]
                .filter(Boolean)
                .join(' - '),
              description: student.parent_name
                ? `Padre/Madre: ${student.parent_name}`
                : undefined,
              path,
              metadata: {
                photoCount: photoCount || 0,
                uploadDate: student.created_at,
              },
              score: maxScore,
              highlighted: {
                title:
                  nameScore > 0
                    ? highlightMatch(student.name, query)
                    : undefined,
                description:
                  parentScore > 0 && student.parent_name
                    ? `Padre/Madre: ${highlightMatch(student.parent_name, query)}`
                    : undefined,
              },
            });
          }
        }
      }
    }

    // Search in photos
    if (types.length === 0 || types.includes('photo')) {
      let photoQuery = supabase
        .from('photos')
        .select(
          `
          id, filename, created_at, approved,
          photo_students:photo_students(
            students:students(
              name,
              courses:courses(
                name,
                event_levels:event_levels(name)
              )
            )
          )
        `
        )
        .eq('event_id', eventId);

      // Apply filters
      if (approved) {
        photoQuery = photoQuery.eq('approved', true);
      }

      if (recent) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        photoQuery = photoQuery.gte('created_at', oneWeekAgo.toISOString());
      }

      const { data: photos } = await photoQuery;

      if (photos) {
        for (const photo of photos) {
          const filenameScore = calculateScore(photo.filename, searchTerm);

          // Also search in tagged student names
          let studentNamesScore = 0;
          const studentNames =
            photo.photo_students
              ?.map((ps) => ps.students?.name)
              .filter(Boolean) || [];
          for (const studentName of studentNames) {
            studentNamesScore = Math.max(
              studentNamesScore,
              calculateScore(studentName, searchTerm)
            );
          }

          const maxScore = Math.max(filenameScore, studentNamesScore);

          if (maxScore > 0) {
            const firstStudent = photo.photo_students?.[0]?.students;
            const path = [
              firstStudent?.courses?.event_levels?.name || 'Sin nivel',
              firstStudent?.courses?.name || 'Sin curso',
              photo.filename,
            ].filter(Boolean);

            results.push({
              id: photo.id,
              type: 'photo',
              title: photo.filename,
              subtitle:
                studentNames.length > 0
                  ? `Etiquetada: ${studentNames.join(', ')}`
                  : 'Sin etiquetar',
              description: `${photo.approved ? 'Aprobada' : 'Pendiente de aprobación'}`,
              path,
              metadata: {
                uploadDate: photo.created_at,
                tags: studentNames,
              },
              score: maxScore,
              highlighted: {
                title:
                  filenameScore > 0
                    ? highlightMatch(photo.filename, query)
                    : undefined,
                subtitle:
                  studentNamesScore > 0 && studentNames.length > 0
                    ? `Etiquetada: ${studentNames
                        .map((name) =>
                          calculateScore(name, searchTerm) > 0
                            ? highlightMatch(name, query)
                            : name
                        )
                        .join(', ')}`
                    : undefined,
              },
            });
          }
        }
      }
    }

    // Apply additional filters
    let filteredResults = results;

    if (hasPhotos) {
      filteredResults = filteredResults.filter(
        (result) => (result.metadata?.photoCount || 0) > 0
      );
    }

    // Sort by score (descending) and limit results
    filteredResults.sort((a, b) => b.score - a.score);
    filteredResults = filteredResults.slice(0, limit);

    return NextResponse.json({
      success: true,
      results: filteredResults,
      query,
      total: filteredResults.length,
      filters: {
        types,
        hasPhotos,
        approved,
        recent,
      },
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        results: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
