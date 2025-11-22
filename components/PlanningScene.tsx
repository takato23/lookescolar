"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Float, PerspectiveCamera, Sphere, useTexture } from "@react-three/drei";
import { useRef, useMemo, useState, Suspense } from "react";
import * as THREE from "three";
import { MotionValue } from "framer-motion";

function LivingLensAnimated({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    // Load the photo texture for the "Exhibit" phase
    // Using a high-quality Unsplash image (Abstract B&W) for the premium feel
    const lensTexture = useTexture("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80");

    // Base Material (Liquid Glass / Lens)
    const lensMaterial = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            roughness: 0.05,
            transmission: 1, // Full glass
            thickness: 2,
            ior: 1.5,
            reflectivity: 0.5,
            metalness: 0,
            clearcoat: 1,
            color: new THREE.Color("#ffffff"),
            map: null, // Start with no texture
        });
    }, []);

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;

        const scroll = scrollProgress.get();
        const time = state.clock.getElapsedTime();

        // Base Rotation
        meshRef.current.rotation.x = time * 0.2;
        meshRef.current.rotation.y = time * 0.25;

        // Phases
        // 0-0.25: CAPTURE (Perfect Lens)
        // 0.25-0.5: EXHIBIT (Flattened Glass Print)
        // 0.5-0.75: PROFIT (Liquid Gold)
        // 0.75-1: JOIN (Dispersed Network)

        let targetScale = new THREE.Vector3(1.8, 1.8, 1.8);
        let targetColor = new THREE.Color("#ffffff");
        let targetMetalness = 0;
        let targetRoughness = 0.05;
        let targetTransmission = 1;
        let targetMapIntensity = 0; // How much of the photo is visible

        if (scroll < 0.25) {
            // Phase 1: CAPTURE (Lens)
            targetScale.set(1.8, 1.8, 1.8);
            targetColor.set("#ffffff");
            targetMetalness = 0;
            targetTransmission = 1;
            targetMapIntensity = 0;
        } else if (scroll < 0.5) {
            // Phase 2: EXHIBIT (Glass Print)
            // Flatten into a "print" shape
            const t = (scroll - 0.25) * 4;
            targetScale.set(2.2, 1.5, 0.1); // Flatten Z significantly
            targetColor.set("#ffffff");
            targetMetalness = 0.1;
            targetTransmission = 0.2; // Become opaque to show texture
            targetMapIntensity = 1;
        } else if (scroll < 0.75) {
            // Phase 3: PROFIT (Gold)
            const t = (scroll - 0.5) * 4;
            targetScale.set(1.8, 1.8, 1.8);
            targetColor.set("#ffcc00"); // Gold
            targetMetalness = 1; // Full metal
            targetRoughness = 0.2;
            targetTransmission = 0; // Solid
            targetMapIntensity = 0;
        } else {
            // Phase 4: JOIN (Network)
            const t = (scroll - 0.75) * 4;
            targetScale.set(2, 2, 2);
            targetColor.set("#00aaff"); // Tech Blue
            targetMetalness = 0.5;
            targetTransmission = 0.5;
            targetRoughness = 0.1;
            targetMapIntensity = 0;
        }

        // Apply Transforms
        meshRef.current.scale.lerp(targetScale, 0.1);

        // Apply Material Props
        const mat = materialRef.current;
        mat.color.lerp(targetColor, 0.05);
        mat.metalness = THREE.MathUtils.lerp(mat.metalness, targetMetalness, 0.05);
        mat.roughness = THREE.MathUtils.lerp(mat.roughness, targetRoughness, 0.05);
        mat.transmission = THREE.MathUtils.lerp(mat.transmission, targetTransmission, 0.05);

        // Handle Texture Visibility
        if (targetMapIntensity > 0.5) {
            mat.map = lensTexture;
            mat.color.set("#ffffff"); // Ensure white base for texture
        } else {
            mat.map = null;
        }
        mat.needsUpdate = true;
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere ref={meshRef} args={[1, 64, 64]}>
                <primitive object={lensMaterial} ref={materialRef} attach="material" />
            </Sphere>
        </Float>
    );
}

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
                <Environment preset="warehouse" /> {/* More industrial/clean reflections */}
                <Suspense fallback={null}>
                    <LivingLensAnimated scrollProgress={scrollProgress} />
                    <NetworkParticles scrollProgress={scrollProgress} />
                </Suspense>
            </Canvas>
        </div>
    );
}
