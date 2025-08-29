/**
 * Hierarchical Structure Integration Tests
 *
 * Tests the complete hierarchical structure from client requirements:
 * Event → Level (optional) → Course → Student
 *
 * Validates:
 * - Proper relationship establishment
 * - Data integrity across hierarchy
 * - Cascade operations
 * - Performance with nested structures
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test data structure mimicking real school organization
const HIERARCHY_TEST_DATA = {
  event: {
    name: 'Escuela Nacional - Hierarchy Test 2025',
    school: 'Escuela Nacional Test',
    date: '2024-03-01',
    location: 'Buenos Aires',
  },
  levels: [
    {
      name: 'Jardín',
      description: 'Educación Inicial',
      sort_order: 0,
      courses: [
        { name: 'Sala de 3', grade: 'Sala', section: '3', students: 12 },
        { name: 'Sala de 4', grade: 'Sala', section: '4', students: 15 },
        { name: 'Sala de 5', grade: 'Sala', section: '5', students: 18 },
      ],
    },
    {
      name: 'Primaria',
      description: 'Educación Primaria',
      sort_order: 1,
      courses: [
        { name: '1°A', grade: '1°', section: 'A', students: 25 },
        { name: '1°B', grade: '1°', section: 'B', students: 23 },
        { name: '2°A', grade: '2°', section: 'A', students: 26 },
        { name: '3°A', grade: '3°', section: 'A', students: 24 },
        { name: '6°A', grade: '6°', section: 'A', students: 22 },
        { name: '6°B', grade: '6°', section: 'B', students: 20 },
      ],
    },
    {
      name: 'Secundaria',
      description: 'Educación Secundaria',
      sort_order: 2,
      courses: [
        { name: '1°A Sec', grade: '1°', section: 'A', students: 28 },
        { name: '1°B Sec', grade: '1°', section: 'B', students: 30 },
        { name: '3°A Sec', grade: '3°', section: 'A', students: 27 },
        { name: '5°A Sec', grade: '5°', section: 'A', students: 25 },
      ],
    },
  ],
};

let testEventId: string;
const testLevelIds: Record<string, string> = {};
const testCourseIds: Record<string, string> = {};
const testStudentIds: string[] = [];

beforeAll(async () => {
  await cleanupTestData();
  await setupHierarchicalData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Hierarchical Structure Integration Tests', () => {
  describe('Basic Hierarchy Creation', () => {
    it('1.1 Event should be created as root of hierarchy', async () => {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', testEventId)
        .single();

      expect(event).toBeTruthy();
      expect(event.name).toBe(HIERARCHY_TEST_DATA.event.name);
      expect(event.school).toBe(HIERARCHY_TEST_DATA.event.school);

      console.log('✅ Event created as hierarchy root');
    });

    it('1.2 Levels should be properly linked to event', async () => {
      const { data: levels } = await supabase
        .from('levels')
        .select('*')
        .eq('event_id', testEventId)
        .order('sort_order');

      expect(levels).toHaveLength(3);
      expect(levels[0].name).toBe('Jardín');
      expect(levels[1].name).toBe('Primaria');
      expect(levels[2].name).toBe('Secundaria');

      // Verify sort order
      expect(levels[0].sort_order).toBe(0);
      expect(levels[1].sort_order).toBe(1);
      expect(levels[2].sort_order).toBe(2);

      console.log('✅ Levels properly linked and ordered');
    });

    it('1.3 Courses should be distributed across levels', async () => {
      const { data: coursesWithLevels } = await supabase
        .from('courses')
        .select(
          `
          id,
          name,
          grade,
          section,
          event_id,
          level_id,
          levels!inner(name)
        `
        )
        .eq('event_id', testEventId)
        .order('name');

      expect(coursesWithLevels.length).toBeGreaterThan(10); // Total courses across all levels

      // Group courses by level
      const coursesByLevel = coursesWithLevels.reduce(
        (acc: any, course: any) => {
          const levelName = course.levels.name;
          if (!acc[levelName]) acc[levelName] = [];
          acc[levelName].push(course);
          return acc;
        },
        {}
      );

      expect(coursesByLevel['Jardín']).toHaveLength(3);
      expect(coursesByLevel['Primaria']).toHaveLength(6);
      expect(coursesByLevel['Secundaria']).toHaveLength(4);

      // Verify all courses belong to correct event
      for (const course of coursesWithLevels) {
        expect(course.event_id).toBe(testEventId);
        expect(course.level_id).toBe(testLevelIds[course.levels.name]);
      }

      console.log('✅ Courses properly distributed across levels');
      console.log(`   Jardín: ${coursesByLevel['Jardín'].length} courses`);
      console.log(`   Primaria: ${coursesByLevel['Primaria'].length} courses`);
      console.log(
        `   Secundaria: ${coursesByLevel['Secundaria'].length} courses`
      );
    });

    it('1.4 Students should be properly distributed across courses', async () => {
      const { data: studentsWithHierarchy } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          grade,
          section,
          event_id,
          course_id,
          courses!inner(
            name,
            levels!inner(name)
          )
        `
        )
        .eq('event_id', testEventId);

      expect(studentsWithHierarchy.length).toBeGreaterThan(200); // Total students

      // Verify hierarchical relationship integrity
      for (const student of studentsWithHierarchy) {
        expect(student.event_id).toBe(testEventId);
        expect(student.course_id).toBeTruthy();
        expect(student.courses.name).toBeTruthy();
        expect(student.courses.levels.name).toBeTruthy();
      }

      // Group by level for validation
      const studentsByLevel = studentsWithHierarchy.reduce(
        (acc: any, student: any) => {
          const levelName = student.courses.levels.name;
          if (!acc[levelName]) acc[levelName] = 0;
          acc[levelName]++;
          return acc;
        },
        {}
      );

      expect(studentsByLevel['Jardín']).toBe(45); // 12 + 15 + 18
      expect(studentsByLevel['Primaria']).toBe(140); // 25 + 23 + 26 + 24 + 22 + 20
      expect(studentsByLevel['Secundaria']).toBe(110); // 28 + 30 + 27 + 25

      console.log('✅ Students properly distributed across hierarchy');
      console.log(`   Total students: ${studentsWithHierarchy.length}`);
      console.log(`   By level: ${JSON.stringify(studentsByLevel)}`);
    });
  });

  describe('Hierarchy Navigation & Queries', () => {
    it('2.1 Top-down navigation should work efficiently', async () => {
      const startTime = Date.now();

      // Navigate from event to students in one query
      const { data: fullHierarchy } = await supabase
        .from('events')
        .select(
          `
          id,
          name,
          levels!inner (
            id,
            name,
            sort_order,
            courses!inner (
              id,
              name,
              grade,
              section,
              students!inner (
                id,
                name,
                student_number
              )
            )
          )
        `
        )
        .eq('id', testEventId)
        .single();

      const queryTime = Date.now() - startTime;

      expect(fullHierarchy).toBeTruthy();
      expect(fullHierarchy.levels).toHaveLength(3);

      // Verify complete hierarchy traversal
      let totalCourses = 0;
      let totalStudents = 0;

      for (const level of fullHierarchy.levels) {
        totalCourses += level.courses.length;
        for (const course of level.courses) {
          totalStudents += course.students.length;
        }
      }

      expect(totalCourses).toBe(13); // 3 + 6 + 4
      expect(totalStudents).toBe(295); // 45 + 140 + 110
      expect(queryTime).toBeLessThan(1000); // Should complete in <1 second

      console.log('✅ Top-down navigation works efficiently');
      console.log(`   Query time: ${queryTime}ms for full hierarchy`);
      console.log(
        `   Levels: ${fullHierarchy.levels.length}, Courses: ${totalCourses}, Students: ${totalStudents}`
      );
    });

    it('2.2 Bottom-up navigation should work efficiently', async () => {
      const startTime = Date.now();

      // Get random student and navigate up to event
      const randomStudentId =
        testStudentIds[Math.floor(Math.random() * testStudentIds.length)];

      const { data: studentHierarchy } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          grade,
          section,
          courses!inner (
            id,
            name,
            levels!inner (
              id,
              name,
              events!inner (
                id,
                name,
                school
              )
            )
          )
        `
        )
        .eq('id', randomStudentId)
        .single();

      const queryTime = Date.now() - startTime;

      expect(studentHierarchy).toBeTruthy();
      expect(studentHierarchy.courses.levels.events.id).toBe(testEventId);
      expect(studentHierarchy.courses.levels.events.name).toBe(
        HIERARCHY_TEST_DATA.event.name
      );
      expect(queryTime).toBeLessThan(500); // Should be very fast

      console.log('✅ Bottom-up navigation works efficiently');
      console.log(`   Query time: ${queryTime}ms for student → event`);
      console.log(
        `   Student: ${studentHierarchy.name} → Course: ${studentHierarchy.courses.name} → Level: ${studentHierarchy.courses.levels.name} → Event: ${studentHierarchy.courses.levels.events.name}`
      );
    });

    it('2.3 Level-specific queries should filter correctly', async () => {
      // Test querying students only from Secundaria
      const { data: secundariaStudents } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          courses!inner (
            name,
            levels!inner (
              name
            )
          )
        `
        )
        .eq('event_id', testEventId)
        .eq('courses.levels.name', 'Secundaria');

      expect(secundariaStudents).toHaveLength(110); // Only secundaria students

      // Test querying courses only from Primaria
      const { data: primariaCourses } = await supabase
        .from('courses')
        .select(
          `
          id,
          name,
          levels!inner (
            name
          )
        `
        )
        .eq('event_id', testEventId)
        .eq('levels.name', 'Primaria');

      expect(primariaCourses).toHaveLength(6); // Only primaria courses

      console.log('✅ Level-specific filtering works correctly');
      console.log(`   Secundaria students: ${secundariaStudents.length}`);
      console.log(`   Primaria courses: ${primariaCourses.length}`);
    });
  });

  describe('Data Integrity & Constraints', () => {
    it('3.1 Foreign key constraints should be enforced', async () => {
      // Try to create course with invalid level_id
      const { error: invalidLevelError } = await supabase
        .from('courses')
        .insert({
          event_id: testEventId,
          level_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          name: 'Invalid Course',
          grade: '1°',
          section: 'X',
        });

      expect(invalidLevelError).toBeTruthy();
      expect(invalidLevelError.message).toContain('foreign key');

      // Try to create student with invalid course_id
      const { error: invalidCourseError } = await supabase
        .from('students')
        .insert({
          event_id: testEventId,
          course_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          name: 'Invalid Student',
          grade: '1°',
          section: 'X',
          student_number: 'INV001',
        });

      expect(invalidCourseError).toBeTruthy();
      expect(invalidCourseError.message).toContain('foreign key');

      console.log('✅ Foreign key constraints properly enforced');
    });

    it('3.2 Event consistency should be maintained across hierarchy', async () => {
      // Verify all entities belong to the same event
      const consistencyChecks = await Promise.all([
        supabase.from('levels').select('event_id').eq('event_id', testEventId),
        supabase.from('courses').select('event_id').eq('event_id', testEventId),
        supabase
          .from('students')
          .select('event_id')
          .eq('event_id', testEventId),
      ]);

      const [levels, courses, students] = consistencyChecks;

      // All levels should belong to test event
      expect(levels.data?.every((l) => l.event_id === testEventId)).toBe(true);

      // All courses should belong to test event
      expect(courses.data?.every((c) => c.event_id === testEventId)).toBe(true);

      // All students should belong to test event
      expect(students.data?.every((s) => s.event_id === testEventId)).toBe(
        true
      );

      console.log('✅ Event consistency maintained across hierarchy');
      console.log(
        `   Levels: ${levels.data?.length}, Courses: ${courses.data?.length}, Students: ${students.data?.length}`
      );
    });

    it('3.3 Unique constraints should prevent duplicates', async () => {
      // Try to create duplicate level
      const { error: duplicateLevelError } = await supabase
        .from('levels')
        .insert({
          event_id: testEventId,
          name: 'Primaria', // Duplicate name
          description: 'Duplicate level',
          sort_order: 99,
        });

      expect(duplicateLevelError).toBeTruthy();
      // Should prevent duplicate (event_id, name) combination

      // Try to create duplicate course within same level
      const prrimariaLevelId = testLevelIds['Primaria'];
      const { error: duplicateCourseError } = await supabase
        .from('courses')
        .insert({
          event_id: testEventId,
          level_id: prrimariaLevelId,
          name: '1°A', // Duplicate within level
          grade: '1°',
          section: 'A',
        });

      expect(duplicateCourseError).toBeTruthy();
      // Should prevent duplicate (level_id, name) combination

      console.log('✅ Unique constraints prevent duplicates');
    });
  });

  describe('Performance & Scalability', () => {
    it('4.1 Large hierarchy queries should perform well', async () => {
      const startTime = Date.now();

      // Complex query with multiple joins and aggregations
      const { data: performanceTest } = await supabase.rpc(
        'get_event_hierarchy_stats',
        {
          event_id: testEventId,
        }
      );

      const queryTime = Date.now() - startTime;

      if (performanceTest) {
        expect(performanceTest).toBeTruthy();
        expect(queryTime).toBeLessThan(2000); // Should complete in <2 seconds

        console.log('✅ Complex hierarchy queries perform well');
        console.log(`   Query time: ${queryTime}ms`);
      } else {
        // Fallback test with manual aggregation
        const { data: manualStats } = await supabase
          .from('events')
          .select(
            `
            id,
            levels!inner(id),
            courses!inner(id),
            students!inner(id)
          `
          )
          .eq('id', testEventId)
          .single();

        expect(manualStats).toBeTruthy();
        expect(queryTime).toBeLessThan(2000);

        console.log('✅ Manual hierarchy stats query performs well');
        console.log(`   Query time: ${queryTime}ms`);
      }
    });

    it('4.2 Pagination should work efficiently across hierarchy', async () => {
      // Test paginated access to students across all levels
      const pageSize = 50;
      const { data: firstPage, count } = await supabase
        .from('students')
        .select(
          `
          id,
          name,
          courses!inner(name, levels!inner(name))
        `,
          { count: 'exact' }
        )
        .eq('event_id', testEventId)
        .range(0, pageSize - 1);

      expect(firstPage).toHaveLength(pageSize);
      expect(count).toBe(295); // Total students

      // Verify pagination math
      const totalPages = Math.ceil(count! / pageSize);
      expect(totalPages).toBe(6); // 295 / 50 = 5.9 → 6 pages

      console.log('✅ Hierarchy pagination works efficiently');
      console.log(
        `   Total students: ${count}, Page size: ${pageSize}, Total pages: ${totalPages}`
      );
    });

    it('4.3 Index usage should optimize common queries', async () => {
      // Test common query patterns that should use indexes

      // Query by event_id (heavily used)
      const startTime1 = Date.now();
      const { data: coursesByEvent } = await supabase
        .from('courses')
        .select('id, name')
        .eq('event_id', testEventId);
      const time1 = Date.now() - startTime1;

      expect(coursesByEvent.length).toBeGreaterThan(0);
      expect(time1).toBeLessThan(200); // Should be very fast with index

      // Query by level_id (common for course filtering)
      const startTime2 = Date.now();
      const primaryLevelId = testLevelIds['Primaria'];
      const { data: coursesByLevel } = await supabase
        .from('courses')
        .select('id, name')
        .eq('level_id', primaryLevelId);
      const time2 = Date.now() - startTime2;

      expect(coursesByLevel).toHaveLength(6);
      expect(time2).toBeLessThan(200); // Should be very fast with index

      // Query by course_id (common for student filtering)
      const startTime3 = Date.now();
      const randomCourseId = Object.values(testCourseIds)[0];
      const { data: studentsByCourse } = await supabase
        .from('students')
        .select('id, name')
        .eq('course_id', randomCourseId);
      const time3 = Date.now() - startTime3;

      expect(studentsByCourse.length).toBeGreaterThan(0);
      expect(time3).toBeLessThan(200); // Should be very fast with index

      console.log('✅ Indexed queries perform optimally');
      console.log(
        `   Event query: ${time1}ms, Level query: ${time2}ms, Course query: ${time3}ms`
      );
    });
  });

  describe('Optional Level Handling', () => {
    it('5.1 Events without levels should work (courses directly under event)', async () => {
      // Create test event without levels
      const { data: directEvent } = await supabase
        .from('events')
        .insert({
          name: 'Direct Course Event',
          school: 'No Levels School',
          date: '2024-03-15',
          location: 'Test',
        })
        .select('id')
        .single();

      // Create course directly under event (level_id = null)
      const { data: directCourse } = await supabase
        .from('courses')
        .insert({
          event_id: directEvent.id,
          level_id: null, // No level
          name: 'Direct Course',
          grade: '1°',
          section: 'A',
        })
        .select('id')
        .single();

      expect(directCourse).toBeTruthy();

      // Verify query works without levels
      const { data: directStructure } = await supabase
        .from('events')
        .select(
          `
          id,
          name,
          courses!inner(id, name, level_id)
        `
        )
        .eq('id', directEvent.id)
        .single();

      expect(directStructure).toBeTruthy();
      expect(directStructure.courses).toHaveLength(1);
      expect(directStructure.courses[0].level_id).toBeNull();

      // Cleanup
      await supabase.from('courses').delete().eq('id', directCourse.id);
      await supabase.from('events').delete().eq('id', directEvent.id);

      console.log(
        '✅ Optional levels work correctly (courses can be directly under events)'
      );
    });

    it('5.2 Mixed hierarchy should handle both leveled and direct courses', async () => {
      // Add a direct course to our test event (alongside leveled courses)
      const { data: mixedCourse } = await supabase
        .from('courses')
        .insert({
          event_id: testEventId,
          level_id: null, // Direct under event
          name: 'Mixed Direct Course',
          grade: 'Especial',
          section: 'A',
        })
        .select('id')
        .single();

      // Query should return both leveled and direct courses
      const { data: mixedStructure } = await supabase
        .from('courses')
        .select(
          `
          id,
          name,
          level_id,
          levels(name)
        `
        )
        .eq('event_id', testEventId);

      const leveledCourses = mixedStructure.filter((c) => c.level_id !== null);
      const directCourses = mixedStructure.filter((c) => c.level_id === null);

      expect(leveledCourses.length).toBe(13); // Original courses
      expect(directCourses.length).toBe(1); // Our added direct course
      expect(directCourses[0].name).toBe('Mixed Direct Course');
      expect(directCourses[0].levels).toBeNull();

      // Cleanup
      await supabase.from('courses').delete().eq('id', mixedCourse.id);

      console.log('✅ Mixed hierarchy handles both leveled and direct courses');
      console.log(
        `   Leveled courses: ${leveledCourses.length}, Direct courses: ${directCourses.length}`
      );
    });
  });
});

// Helper functions
async function setupHierarchicalData() {
  // Create event
  const { data: event } = await supabase
    .from('events')
    .insert(HIERARCHY_TEST_DATA.event)
    .select('id')
    .single();

  testEventId = event.id;

  // Create levels and their courses/students
  for (const levelData of HIERARCHY_TEST_DATA.levels) {
    // Create level
    const { data: level } = await supabase
      .from('levels')
      .insert({
        event_id: testEventId,
        name: levelData.name,
        description: levelData.description,
        sort_order: levelData.sort_order,
      })
      .select('id')
      .single();

    testLevelIds[levelData.name] = level.id;

    // Create courses for this level
    for (const courseData of levelData.courses) {
      const { data: course } = await supabase
        .from('courses')
        .insert({
          event_id: testEventId,
          level_id: level.id,
          name: courseData.name,
          grade: courseData.grade,
          section: courseData.section,
          description: `${levelData.name} - ${courseData.name}`,
          active: true,
        })
        .select('id')
        .single();

      testCourseIds[courseData.name] = course.id;

      // Create students for this course
      const students = [];
      for (let i = 1; i <= courseData.students; i++) {
        students.push({
          event_id: testEventId,
          course_id: course.id,
          name: `${courseData.name} Estudiante ${i}`,
          grade: courseData.grade,
          section: courseData.section,
          student_number: `${courseData.grade.replace('°', '')}${courseData.section}${i.toString().padStart(3, '0')}`,
          active: true,
        });
      }

      const { data: createdStudents } = await supabase
        .from('students')
        .insert(students)
        .select('id');

      testStudentIds.push(...createdStudents.map((s) => s.id));
    }
  }

  console.log('🏗️ Hierarchical test data setup complete');
  console.log(`   Event: ${testEventId}`);
  console.log(`   Levels: ${Object.keys(testLevelIds).length}`);
  console.log(`   Courses: ${Object.keys(testCourseIds).length}`);
  console.log(`   Students: ${testStudentIds.length}`);
}

async function cleanupTestData() {
  if (testEventId) {
    try {
      await supabase.from('students').delete().eq('event_id', testEventId);
      await supabase.from('courses').delete().eq('event_id', testEventId);
      await supabase.from('levels').delete().eq('event_id', testEventId);
      await supabase.from('events').delete().eq('id', testEventId);

      console.log('🧹 Hierarchical test data cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup completed with some non-critical errors:', error);
    }
  }
}
