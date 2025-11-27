"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Float, PerspectiveCamera, Sphere, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useRef, useMemo, useState, Suspense } from "react";
import * as THREE from "three";
import { MotionValue } from "framer-motion";
import { PlanningShutter } from "./PlanningShutter";

function NetworkParticles({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
    const pointsRef = useRef<THREE.Points>(null);

    // Create random points
    const particles = useMemo(() => {
        const count = 300;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 4; // Radius
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }
        return positions;
    }, []);

    useFrame(() => {
        if (!pointsRef.current) return;
        const scroll = scrollProgress.get();
        // Only visible in Phase 4 (scroll > 0.75)
        // Fade in
        const opacity = scroll > 0.75 ? Math.min((scroll - 0.75) * 4, 1) : 0;

        const material = pointsRef.current.material as THREE.PointsMaterial;
        material.opacity = opacity;

        // Rotate
        pointsRef.current.rotation.y += 0.002;
        pointsRef.current.rotation.x += 0.001;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[particles, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#00aaff"
                transparent
                opacity={0}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    );
}

export default function PlanningScene({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
    return (
        <div className="fixed inset-0 z-0 bg-white">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 6]} />
                {/* Studio Lighting for Liquid Crystal feel - Bright & Clean */}
                <ambientLight intensity={2} />
                <rectAreaLight width={10} height={10} position={[5, 5, 5]} intensity={15} color="#ffffff" />
                <rectAreaLight width={10} height={10} position={[-5, -5, 5]} intensity={10} color="#ffffff" />
                <rectAreaLight width={20} height={2} position={[0, 10, 0]} intensity={5} color="#e0e0ff" /> {/* Top cool light */}
                <Environment files="/assets/apertura_studio.hdr" /> {/* More industrial/clean reflections */}
                <Suspense fallback={null}>
                    <PlanningShutter scrollProgress={scrollProgress} />
                    <NetworkParticles scrollProgress={scrollProgress} />
                </Suspense>
                <EffectComposer disableNormalPass multisampling={0}>
                    <Bloom luminanceThreshold={1} mipmapBlur intensity={0.3} radius={0.3} />
                    {/* Noise disabled for performance */}
                    {/* <Noise opacity={0.02} /> */}
                    <Vignette eskil={false} offset={0.1} darkness={0.5} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
