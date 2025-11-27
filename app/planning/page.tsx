'use client';

import dynamic from 'next/dynamic';

const PlanningPage = dynamic(() => import("@/components/PlanningPage"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
    ),
});

export default function Page() {
    return <PlanningPage />;
}
