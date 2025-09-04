'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Camera, RefreshCw } from 'lucide-react';

export default function LegacyPhotosRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Build new URL based on legacy parameters
    const eventId = searchParams?.get('eventId');
    const courseId = searchParams?.get('courseId');
    const codeId = searchParams?.get('codeId');

    let newUrl = '/admin/photos';
    const params = new URLSearchParams();

    if (eventId) {
      // If an eventId is present, prefer unified event interface
      router.replace(`/admin/events/${eventId}/unified`);
      return;
    }
    if (courseId) {
      params.set('courseId', courseId);
    }
    if (codeId) {
      params.set('studentId', codeId); // Map codeId to studentId
    }

    if (params.toString()) {
      newUrl += `?${params.toString()}`;
    }

    // Redirect after a short delay to show the migration message
    const timer = setTimeout(() => {
      router.replace(newUrl);
    }, 1000); // Reduced from 2000ms to 1000ms

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  const handleRedirectNow = () => {
    const eventId = searchParams?.get('eventId');
    const courseId = searchParams?.get('courseId');
    const codeId = searchParams?.get('codeId');

    let newUrl = '/admin/photos';
    const params = new URLSearchParams();

    if (eventId) {
      router.replace(`/admin/events/${eventId}/unified`);
      return;
    }
    if (courseId) params.set('courseId', courseId);
    if (codeId) params.set('studentId', codeId);

    if (params.toString()) {
      newUrl += `?${params.toString()}`;
    }

    router.replace(newUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Gallery System Updated!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            We've upgraded to a new unified photo gallery system with better
            organization and performance.
          </p>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">What's New:</h4>
            <ul className="space-y-1 text-left text-sm text-blue-800">
              <li>• Unified interface for all photo management</li>
              <li>• Clear hierarchy: Event → Level → Course → Student</li>
              <li>• Bulk operations for efficient workflow</li>
              <li>• Improved performance and mobile support</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Redirecting automatically in 1 second...</span>
          </div>

          <Button onClick={handleRedirectNow} className="w-full">
            Go to New Gallery Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
