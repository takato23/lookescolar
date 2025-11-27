"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamic imports to avoid SSR issues with @react-three
const Canvas = dynamic(
    () => import("@react-three/fiber").then(mod => ({ default: mod.Canvas })),
    { ssr: false }
);

// Create a wrapper component for the 3D content
const LandingScene = dynamic(
    () => import("./LandingScene"),
    { ssr: false }
);

export default function LandingPage() {
    return (
        <div
            className="h-screen w-full bg-black bg-cover bg-center"
            style={{ backgroundImage: "url('/images/background-texture.png')" }}
        >
            <Suspense fallback={
                <div className="flex h-full items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                </div>
            }>
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                    <LandingScene />
                </Canvas>
            </Suspense>
        </div>
    );
}
