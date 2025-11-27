"use client";

import { ScrollControls, Scroll, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { IrisMechanism } from "./IrisMechanism";
import { AperturaContent } from "./AperturaContent";
import { Particles, TunnelSpeedLines } from "./Particles";
import { Suspense, useEffect, useState, useMemo } from "react";
import { APERTURA_CONFIG } from "./config";
import { useLandingState } from "./LandingState";
import * as THREE from "three";

interface AperturaSceneProps {
    isMobile: boolean;
    onNavigate: (path: string) => void;
}

// ============================================================================
// LAYER 5: DYNAMIC POST-PROCESSING
// Responds to tunnel state for dramatic effect
// ============================================================================
function DynamicPostProcessing() {
    const { isOpening } = useLandingState();
    const [bloomIntensity, setBloomIntensity] = useState(0.4);
    const [chromaticOffset, setChromaticOffset] = useState(0);
    const [vignetteDarkness, setVignetteDarkness] = useState(0.6);

    // Memoize chromatic aberration offset vector to prevent object creation each frame
    const chromaticOffsetVector = useMemo(
        () => new THREE.Vector2(chromaticOffset, chromaticOffset),
        [chromaticOffset]
    );

    // Smooth transitions for post-processing - FIXED: proper cleanup
    useEffect(() => {
        let frame: number;
        let lastTime = performance.now();
        const targetFPS = 60;
        const frameTime = 1000 / targetFPS;

        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;

            // Throttle updates to target FPS to reduce unnecessary state changes
            if (deltaTime >= frameTime) {
                if (isOpening) {
                    setBloomIntensity(prev => Math.min(prev + 0.02, 2.5));
                    setChromaticOffset(prev => Math.min(prev + 0.0003, 0.008));
                    setVignetteDarkness(prev => Math.min(prev + 0.01, 0.9));
                } else {
                    setBloomIntensity(prev => Math.max(prev - 0.03, 0.4));
                    setChromaticOffset(prev => Math.max(prev - 0.0005, 0));
                    setVignetteDarkness(prev => Math.max(prev - 0.02, 0.6));
                }
                lastTime = currentTime;
            }

            frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);

        // CRITICAL FIX: Cleanup requestAnimationFrame to prevent memory leak
        return () => {
            if (frame) {
                cancelAnimationFrame(frame);
            }
        };
    }, [isOpening]);

    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.8}
                mipmapBlur
                intensity={bloomIntensity}
                radius={0.7}
            />
            <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={chromaticOffsetVector}
            />
            <Vignette
                eskil={false}
                offset={0.25}
                darkness={vignetteDarkness}
            />
        </EffectComposer>
    );
}

export default function AperturaScene({ isMobile, onNavigate }: AperturaSceneProps) {
    return (
        <Suspense fallback={null}>
            {/* Ambient Light - Soft base */}
            <ambientLight intensity={0.8} />

            {/* Hemisphere Light - Sky/Ground color difference */}
            <hemisphereLight
                color="#aaccff"
                groundColor="#442211"
                intensity={0.4}
            />

            <ScrollControls pages={5} damping={APERTURA_CONFIG.animation.scrollDamping}>
                {/* 3D Iris Mechanism */}
                <IrisMechanism />

                {/* Atmospheric Particles with Float */}
                <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.3}>
                    <Particles count={isMobile ? 80 : 150} />
                </Float>

                {/* Tunnel Speed Lines - Only visible during transition */}
                <TunnelSpeedLines count={isMobile ? 60 : 120} />

                {/* HTML Content Layer */}
                <Scroll html style={{ width: "100%" }}>
                    <AperturaContent onNavigate={onNavigate} />
                </Scroll>
            </ScrollControls>

            {/* Dynamic Post Processing */}
            <DynamicPostProcessing />
        </Suspense>
    );
}
