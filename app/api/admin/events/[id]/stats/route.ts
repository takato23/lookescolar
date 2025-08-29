import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/events/[id]/stats
export const GET = withAuth(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
  ) => {
    try {
      // Support Next.js async params
      const resolved = (params as any)?.then
        ? await (params as Promise<{ id: string }>)
        : (params as { id: string });
      const eventId = resolved.id;
      const supabase = await createServerSupabaseServiceClient();

      // Optimized counts with minimal payload
      const [
        levelsCountRes,
        totalCoursesRes,
        activeCoursesRes,
        totalStudentsRes,
        activeStudentsRes,
        studentsWithCourseRes,
        totalPhotosRes,
        approvedPhotosRes,
        untaggedPhotosRes,
        processingPhotosRes,
        totalOrdersRes,
        paidOrdersRes,
        pendingOrdersRes,
        revenueCentsRes,
      ] = await Promise.all([
        supabase
          .from('event_levels')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .eq('active', true),
        supabase
          .from('courses')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId),
        supabase
          .from('courses')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .eq('active', true),
        supabase
          .from('students')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId),
        supabase
          .from('students')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .eq('active', true),
        supabase
          .from('students')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .not('course_id', 'is', null),
        // Assets counts via folders (nuevo sistema)
        (async () => {
          const { data: folders } = await supabase
            .from('folders')
            .select('id')
            .eq('event_id', eventId);
          if (!folders?.length) return { count: 0 };
          const folderIds = folders.map((f) => f.id);
          return supabase
            .from('assets')
            .select('id', { count: 'planned', head: true })
            .in('folder_id', folderIds);
        })(),
        (async () => {
          const { data: folders } = await supabase
            .from('folders')
            .select('id')
            .eq('event_id', eventId);
          if (!folders?.length) return { count: 0 };
          const folderIds = folders.map((f) => f.id);
          return supabase
            .from('assets')
            .select('id', { count: 'planned', head: true })
            .in('folder_id', folderIds)
            .eq('status', 'ready');
        })(),
        // Untagged approximated by missing subject_id in metadata
        (async () => {
          const { data: folders } = await supabase
            .from('folders')
            .select('id')
            .eq('event_id', eventId);
          if (!folders?.length) return { count: 0 };
          const folderIds = folders.map((f) => f.id);
          return supabase
            .from('assets')
            .select('id', { count: 'planned', head: true })
            .in('folder_id', folderIds)
            .or('metadata->subject_id.is.null,metadata.is.null');
        })(),
        // Processing by status column
        (async () => {
          const { data: folders } = await supabase
            .from('folders')
            .select('id')
            .eq('event_id', eventId);
          if (!folders?.length) return { count: 0 };
          const folderIds = folders.map((f) => f.id);
          return supabase
            .from('assets')
            .select('id', { count: 'planned', head: true })
            .in('folder_id', folderIds)
            .eq('status', 'processing');
        })(),
        supabase
          .from('orders')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId),
        supabase
          .from('orders')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .in('status', ['paid', 'completed']),
        supabase
          .from('orders')
          .select('id', { count: 'planned', head: true })
          .eq('event_id', eventId)
          .in('status', ['pending', 'processing']),
        // Revenue placeholder (orders table doesn't have amount fields)
        Promise.resolve({ data: [{ revenue_cents: 0 }] }),
      ]);

      // Process results
      const totalLevels = levelsCountRes.count || 0;
      const totalCourses = totalCoursesRes.count || 0;
      const activeCourses = activeCoursesRes.count || 0;
      const totalStudents = totalStudentsRes.count || 0;
      const activeStudents = activeStudentsRes.count || 0;
      const studentsWithCourse = studentsWithCourseRes.count || 0;
      const studentsWithoutCourse = Math.max(
        0,
        totalStudents - studentsWithCourse
      );
      const totalPhotos = totalPhotosRes.count || 0;
      const approvedPhotos = approvedPhotosRes.count || 0;
      const untaggedPhotos = untaggedPhotosRes.count || 0;
      const processingPhotos = processingPhotosRes.count || 0;
      const totalOrders = totalOrdersRes.count || 0;
      const paidOrders = paidOrdersRes.count || 0;
      const pendingOrders = pendingOrdersRes.count || 0;
      const totalRevenueCents = Array.isArray(revenueCentsRes.data)
        ? (revenueCentsRes.data[0]?.revenue_cents ?? 0)
        : 0;

      // Calculate additional metrics
      const avgPhotosPerStudent =
        activeStudents > 0
          ? Math.round((approvedPhotos / activeStudents) * 100) / 100
          : 0;
      const avgStudentsPerCourse =
        activeCourses > 0
          ? Math.round((activeStudents / activeCourses) * 100) / 100
          : 0;
      const photoTaggingProgress =
        totalPhotos > 0
          ? Math.round(((totalPhotos - untaggedPhotos) / totalPhotos) * 100)
          : 0;
      const orderConversionRate =
        activeStudents > 0
          ? Math.round((totalOrders / activeStudents) * 100)
          : 0;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivityResults = await Promise.all([
        // Recent students
        supabase
          .from('students')
          .select('id', { count: 'exact' })
          .eq('event_id', eventId)
          .gte('created_at', sevenDaysAgo.toISOString()),

        // Recent assets (via folders)
        (async () => {
          const { data: folders } = await supabase
            .from('folders')
            .select('id')
            .eq('event_id', eventId);
          if (!folders?.length) return { count: 0 };
          const folderIds = folders.map((f) => f.id);
          return supabase
            .from('assets')
            .select('id', { count: 'exact' })
            .in('folder_id', folderIds)
            .gte('created_at', sevenDaysAgo.toISOString());
        })(),

        // Recent orders
        supabase
          .from('orders')
          .select(
            `
          id,
          subjects!inner(event_id)
        `,
            { count: 'exact' }
          )
          .eq('subjects.event_id', eventId)
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const recentActivity = {
        new_students: recentActivityResults[0].count || 0,
        new_photos: recentActivityResults[1].count || 0,
        new_orders: recentActivityResults[2].count || 0,
      };

      // Performance indicators
      const performanceIndicators = {
        health_score: calculateHealthScore({
          totalStudents: activeStudents,
          totalPhotos,
          approvedPhotos,
          untaggedPhotos,
          totalOrders,
          studentsWithoutCourse,
        }),
        completion_rate: photoTaggingProgress,
        engagement_rate: orderConversionRate,
        avg_photos_per_student: avgPhotosPerStudent,
      };

      const coursesByLevel: Record<string, number> = {};

      const stats = {
        // Core counts
        total_levels: totalLevels,
        total_courses: totalCourses,
        active_courses: activeCourses,
        total_students: totalStudents,
        active_students: activeStudents,
        total_photos: totalPhotos,
        approved_photos: approvedPhotos,
        total_orders: totalOrders,

        // Breakdowns
        students_with_course: studentsWithCourse,
        students_without_course: studentsWithoutCourse,
        untagged_photos: untaggedPhotos,
        processing_photos: processingPhotos,
        pending_orders: pendingOrders,
        paid_orders: paidOrders,

        // Financial
        total_revenue_cents: totalRevenueCents,
        avg_order_value_cents:
          totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0,

        // Ratios and percentages
        avg_photos_per_student: avgPhotosPerStudent,
        avg_students_per_course: avgStudentsPerCourse,
        photo_tagging_progress: photoTaggingProgress,
        order_conversion_rate: orderConversionRate,

        // Distribution (minimal until we compute detailed breakdown)
        courses_by_level: coursesByLevel,

        // Recent activity
        recent_activity: recentActivity,

        // Performance indicators
        performance: performanceIndicators,

        // Timestamps
        last_updated: new Date().toISOString(),
      };

      return NextResponse.json(
        { stats },
        {
          headers: {
            'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
          },
        }
      );
    } catch (error) {
      console.error('Error in GET /api/admin/events/[id]/stats:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// Calculate overall health score (0-100)
function calculateHealthScore(metrics: {
  totalStudents: number;
  totalPhotos: number;
  approvedPhotos: number;
  untaggedPhotos: number;
  totalOrders: number;
  studentsWithoutCourse: number;
}): number {
  let score = 100;

  // Deduct points for issues
  if (metrics.totalStudents === 0) {
    score -= 30; // No students is a major issue
  } else {
    // Deduct for students without courses (organization issue)
    const studentsWithoutCourseRatio =
      metrics.studentsWithoutCourse / metrics.totalStudents;
    score -= Math.round(studentsWithoutCourseRatio * 20);
  }

  if (metrics.totalPhotos === 0) {
    score -= 25; // No photos is a major issue
  } else {
    // Deduct for untagged photos
    const untaggedRatio = metrics.untaggedPhotos / metrics.totalPhotos;
    score -= Math.round(untaggedRatio * 25);
  }

  // Deduct for low engagement (orders)
  if (metrics.totalStudents > 0) {
    const orderRatio = metrics.totalOrders / metrics.totalStudents;
    if (orderRatio < 0.1) {
      score -= 15; // Less than 10% order rate
    } else if (orderRatio < 0.3) {
      score -= 10; // Less than 30% order rate
    }
  }

  return Math.max(0, Math.min(100, score));
}
