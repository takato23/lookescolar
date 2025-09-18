'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function UnifiedGalleryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build the unified photos URL with filters
    const params = new URLSearchParams();

    // Pass through any existing query parameters as filters
    const eventId = searchParams?.get('eventId');
    const levelId = searchParams?.get('levelId');
    const courseId = searchParams?.get('courseId');
    const studentId = searchParams?.get('studentId');

    if (eventId) params.set('event_id', eventId);
    if (levelId) params.set('folder_id', levelId); // levels map to folders
    if (courseId) params.set('folder_id', courseId); // courses map to folders
    if (studentId) params.set('student_id', studentId);

    // Redirect to unified photos interface with appropriate filters
    const unifiedUrl = `/admin/photos${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(unifiedUrl);
  }, [router, searchParams]);

  // Loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-500 dark:text-gray-400">Redirecting to unified photo system...</p>
      </div>
    </div>
  );
}
