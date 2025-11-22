"use client";

import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("./AperturaLanding"), {
    ssr: false,
});

export default function LandingPageLoader() {
    return <LandingPage />;
}
