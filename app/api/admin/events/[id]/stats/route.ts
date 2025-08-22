import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// GET /api/admin/events/[id]/stats
export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const eventId = params.id;
    const supabase = await createServerSupabaseServiceClient();

    // Get comprehensive event statistics
    const [
      levelsResult,
      coursesResult,
      studentsResult,
      photosResult,
      ordersResult,
    ] = await Promise.all([
      // Event levels count
      supabase
        .from('event_levels')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('active', true),
      
      // Courses count and breakdown
      supabase
        .from('courses')
        .select('id, active, level_id', { count: 'exact' })
        .eq('event_id', eventId),
      
      // Students count and breakdown
      supabase
        .from('students')
        .select('id, active, course_id', { count: 'exact' })
        .eq('event_id', eventId),
      
      // Photos count and status
      supabase
        .from('photos')
        .select('id, approved, status', { count: 'exact' })
        .eq('event_id', eventId),
      
      // Orders statistics
      supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          subjects!inner(event_id)
        `, { count: 'exact' })
        .eq('subjects.event_id', eventId),
    ]);

    // Process results
    const totalLevels = levelsResult.count || 0;
    
    const courses = coursesResult.data || [];
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.active).length;
    const coursesByLevel = courses.reduce((acc: Record<string, number>, course) => {
      const levelId = course.level_id || 'no_level';
      acc[levelId] = (acc[levelId] || 0) + 1;
      return acc;
    }, {});

    const students = studentsResult.data || [];
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.active).length;
    const studentsWithCourse = students.filter(s => s.course_id).length;
    const studentsWithoutCourse = students.filter(s => !s.course_id).length;

    const photos = photosResult.data || [];
    const totalPhotos = photos.length;
    const approvedPhotos = photos.filter(p => p.approved).length;
    const untaggedPhotos = photos.filter(p => p.status === 'untagged' || !p.status).length;
    const processingPhotos = photos.filter(p => p.status === 'processing').length;

    const orders = ordersResult.data || [];
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const totalRevenue = orders
      .filter(o => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, order) => sum + (order.total_amount || 0), 0);

    // Calculate additional metrics
    const avgPhotosPerStudent = activeStudents > 0 ? Math.round((approvedPhotos / activeStudents) * 100) / 100 : 0;
    const avgStudentsPerCourse = activeCourses > 0 ? Math.round((activeStudents / activeCourses) * 100) / 100 : 0;
    const photoTaggingProgress = totalPhotos > 0 ? Math.round(((totalPhotos - untaggedPhotos) / totalPhotos) * 100) : 0;
    const orderConversionRate = activeStudents > 0 ? Math.round((totalOrders / activeStudents) * 100) : 0;

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
      
      // Recent photos
      supabase
        .from('photos')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      
      // Recent orders
      supabase
        .from('orders')
        .select(`
          id,
          subjects!inner(event_id)
        `, { count: 'exact' })
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
      total_revenue: totalRevenue,
      avg_order_value: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
      
      // Ratios and percentages
      avg_photos_per_student: avgPhotosPerStudent,
      avg_students_per_course: avgStudentsPerCourse,
      photo_tagging_progress: photoTaggingProgress,
      order_conversion_rate: orderConversionRate,
      
      // Distribution
      courses_by_level: coursesByLevel,
      
      // Recent activity
      recent_activity: recentActivity,
      
      // Performance indicators
      performance: performanceIndicators,
      
      // Timestamps
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/admin/events/[id]/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

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
    const studentsWithoutCourseRatio = metrics.studentsWithoutCourse / metrics.totalStudents;
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