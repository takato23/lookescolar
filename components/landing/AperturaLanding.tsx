"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useLandingState } from "./LandingState";
import { useRouter } from "next/navigation";

// Dynamic imports to avoid SSR issues with @react-three/drei Html component
const Canvas = dynamic(
    () => import("@react-three/fiber").then(mod => ({ default: mod.Canvas })),
    { ssr: false }
);

const AperturaScene = dynamic(
    () => import("./AperturaScene"),
    { ssr: false }
);

// ============================================================================
// MAIN LANDING COMPONENT
// ============================================================================
export default function AperturaLanding() {
    const router = useRouter();

    const handleNavigate = (path: string) => {
        console.log('Navigating to:', path);
        try {
            router.push(path);
        } catch (error) {
            console.error('Navigation error:', error);
            window.location.href = path;
        }
    };

    // Suppress R3F warnings in development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            const originalError = console.error;
            console.error = (...args: unknown[]) => {
                if (
                    typeof args[0] === 'string' &&
                    (args[0].includes('createRoot()') ||
                        args[0].includes('already been passed to createRoot'))
                ) {
                    return;
                }
                originalError.apply(console, args);
            };
            return () => {
                console.error = originalError;
            };
        }
    }, []);

    const [isMobile, setIsMobile] = useState(false);

    // FIXED: Debounce resize events to prevent excessive re-renders
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(checkMobile, 150); // Debounce 150ms
        };

        checkMobile();
        window.addEventListener('resize', handleResize, { passive: true });

        // CRITICAL FIX: Cleanup both listener and pending timeout
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            {/* Premium Background Gradient */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background: `
                        radial-gradient(ellipse at 30% 20%, rgba(20, 40, 80, 0.4) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(60, 20, 80, 0.3) 0%, transparent 50%),
                        radial-gradient(circle at 50% 50%, rgba(0, 20, 40, 0.8) 0%, transparent 70%),
                        linear-gradient(180deg, #000000 0%, #050510 50%, #000005 100%)
                    `
                }}
            />

            {/* Subtle Noise Texture */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "repeat"
                }}
            />

            <Suspense fallback={
                <div className="flex h-full items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                </div>
            }>
                <Canvas
                    key="apertura-canvas"
                    camera={{ position: [0, 0, isMobile ? 5 : 4], fov: isMobile ? 50 : 45 }}
                    gl={{
                        antialias: !isMobile,
                        alpha: true,
                        powerPreference: "high-performance",
                        stencil: false
                    }}
                    dpr={[1, isMobile ? 1.5 : 2]}
                >
                    <AperturaScene isMobile={isMobile} onNavigate={handleNavigate} />
                </Canvas>
            </Suspense>

            {/* Corner Accent Lights */}
            <div
                className="absolute top-0 left-0 w-96 h-96 pointer-events-none z-[2]"
                style={{
                    background: "radial-gradient(circle at top left, rgba(100, 150, 255, 0.1) 0%, transparent 60%)"
                }}
            />
            <div
                className="absolute bottom-0 right-0 w-96 h-96 pointer-events-none z-[2]"
                style={{
                    background: "radial-gradient(circle at bottom right, rgba(255, 100, 50, 0.08) 0%, transparent 60%)"
                }}
            />
        </div>
    );
}
