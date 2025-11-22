# CONTINUATION PROMPT: Apertura Landing Page Refinement

**Role:** You are an expert Creative Developer specializing in React Three Fiber, Shaders, and Premium Web Design.

**Context:**
You are working on the rebranding of a photography platform called "Look Escolar" to **"Apertura"**.
The core concept is a **Mechanical Iris (Camera Shutter)** that opens and closes as the user scrolls, revealing content.
The aesthetic is **Dark, Cinematic, Premium, and High-Tech**.

**Current Status:**
We have implemented the core landing page structure with a 3D background and HTML overlay.
-   **`AperturaLanding.tsx`**: Sets up the Canvas, ScrollControls, and Environment.
-   **`IrisMechanism.tsx`**: The 3D component featuring:
    -   Procedural blades (ExtrudeGeometry).
    -   A central "Liquid Glass" lens (`MeshTransmissionMaterial`).
    -   A glowing "Sensor" core.
    -   **Current Lighting**: A strong fixed lateral spotlight + a volumetric ray mesh (cylinder with additive blending) to create a dramatic "God Ray" effect.
    -   **Interaction**: Subtle 3D tilt based on mouse position.
-   **`AperturaContent.tsx`**: HTML overlay with Framer Motion animations synchronized with the scroll.

**The Goal:**
The user wants to refine the visual experience to be absolutely perfect.
-   **Lighting**: We just switched to a **fixed lateral light** setup because the user disliked the mouse-following light (felt "out of phase").
-   **Atmosphere**: The goal is a "mysterious, cinematic" vibe with visible light beams (volumetric rays) and high-contrast metallic reflections.
-   **Next Steps**: You need to be ready to fine-tune the materials, the intensity of the volumetric ray, and the responsiveness of the iris. The user might ask for more "life" or specific visual tweaks.

**Current Codebase Snapshot:**

### `components/landing/IrisMechanism.tsx`
```tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScroll, MeshTransmissionMaterial } from "@react-three/drei";

export function IrisMechanism() {
    const group = useRef<THREE.Group>(null);
    const bladesRef = useRef<THREE.Group[]>([]);
    const sensorLightRef = useRef<THREE.PointLight>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const scroll = useScroll();
    
    // Configuration
    const bladeCount = 12;
    
    // Create blade geometry
    const bladeGeometry = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(1, 0.5, 2, 2);
        shape.lineTo(2, 4);
        shape.lineTo(-1, 4);
        shape.lineTo(-1, 1);
        shape.quadraticCurveTo(-0.5, 0.2, 0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, []);

    // Material for the blades (Premium Metal)
    const bladeMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#2a2a2a",
            metalness: 1,
            roughness: 0.15,
            envMapIntensity: 2,
            side: THREE.DoubleSide
        });
    }, []);

    // Material for the ring (Brushed Gold/Bronze accent)
    const ringMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#d4af37",
            metalness: 1,
            roughness: 0.2,
            envMapIntensity: 3,
        });
    }, []);

    useFrame((state, delta) => {
        if (!group.current) return;

        // Scroll Choreography
        let targetAperture = 0;
        const s = scroll.offset;

        if (s < 0.2) {
            targetAperture = THREE.MathUtils.lerp(0.2, 0.4, s * 5);
        } else if (s < 0.4) {
            const t = (s - 0.2) * 5;
            targetAperture = THREE.MathUtils.lerp(0.4, 0.1, t);
        } else if (s < 0.6) {
            const t = (s - 0.4) * 5;
            targetAperture = THREE.MathUtils.lerp(0.1, 1, t);
        } else if (s < 0.85) {
            targetAperture = 1;
        } else {
            const t = (s - 0.85) * 6.66;
            targetAperture = THREE.MathUtils.lerp(1, 0, t);
        }

        // Animate blades
        bladesRef.current.forEach((blade, i) => {
            if (blade) {
                const baseRotation = (i / bladeCount) * Math.PI * 2;
                const angle = THREE.MathUtils.lerp(0, -0.8, targetAperture);
                blade.rotation.z = baseRotation + angle;
                
                const dist = THREE.MathUtils.lerp(2.5, 3.5, targetAperture);
                blade.position.x = Math.cos(baseRotation) * dist;
                blade.position.y = Math.sin(baseRotation) * dist;
            }
        });
        
        // Rotate the whole mechanism slightly for dynamism
        group.current.rotation.z += delta * 0.05;

        // MOUSE TILT (Subtle)
        const tiltX = (state.mouse.y * 0.1);
        const tiltY = (state.mouse.x * 0.1);
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, tiltX, delta * 2);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, tiltY, delta * 2);
    });

    return (
        <group ref={group} position={[0, 0, 0]}>
            {/* CINEMATIC LIGHTING SETUP */}
            
            {/* 1. Strong Lateral Beam (Top Right) */}
            <spotLight 
                position={[10, 5, 5]} 
                intensity={8} 
                color="#ffffff" 
                angle={0.3} 
                penumbra={0.5} 
                distance={30} 
                castShadow
            />

            {/* 2. Cool Rim Light (Back Left) */}
            <pointLight position={[-5, 2, -2]} intensity={2} color="#44aaff" distance={15} />

            {/* 3. Soft Fill (Bottom) */}
            <pointLight position={[0, -5, 2]} intensity={0.5} color="#ffffff" distance={10} />

            {/* VOLUMETRIC RAY MESH */}
            <mesh position={[4, 3, 2]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.1, 4, 15, 32, 1, true]} />
                <meshBasicMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.03} 
                    side={THREE.DoubleSide} 
                    blending={THREE.AdditiveBlending} 
                    depthWrite={false}
                />
            </mesh>

            {/* Outer Ring / Body */}
            <mesh position={[0, 0, -0.1]}>
                <ringGeometry args={[3.5, 6, 64]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* Sensor Core */}
            <mesh position={[0, 0, -0.5]}>
                <circleGeometry args={[2, 64]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            
            {/* Sensor Light Glow */}
            <pointLight ref={sensorLightRef} position={[0, 0, -0.2]} intensity={5} color="#44aaff" distance={3} decay={2} />

            {/* Liquid Glass Lens */}
            <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.8, 2.8, 0.3, 64]} />
                <MeshTransmissionMaterial
                    backside
                    samples={4}
                    thickness={0.5}
                    chromaticAberration={0.1}
                    anisotropy={0.3}
                    distortion={0.4}
                    distortionScale={0.5}
                    temporalDistortion={0.2}
                    ior={1.5}
                    color="#ffffff"
                    background={new THREE.Color('#000000')}
                />
            </mesh>

            {/* Blades */}
            {Array.from({ length: bladeCount }).map((_, i) => (
                <group 
                    key={i} 
                    ref={(el) => { if (el) bladesRef.current[i] = el; }}
                >
                    <mesh 
                        geometry={bladeGeometry} 
                        material={bladeMaterial} 
                        position={[0, 0, i * 0.001 + 0.2]} 
                        rotation={[0, 0, 2]} 
                    />
                </group>
            ))}
        </group>
    );
}
```

### `components/landing/AperturaLanding.tsx`
```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Environment, Float } from "@react-three/drei";
import { IrisMechanism } from "./IrisMechanism";
import { AperturaContent } from "./AperturaContent";
import { Particles } from "./Particles";
import { Suspense } from "react";
import * as THREE from "three";

export default function AperturaLanding() {
    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            <div
                className="absolute inset-0 opacity-20 pointer-events-none z-0"
                style={{
                    backgroundImage: "url('/images/background-texture.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

            <Canvas
                camera={{ position: [0, 0, 5], fov: 35 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
            >
                <Suspense fallback={null}>
                    <Environment preset="studio" />

                    <ScrollControls pages={5} damping={0.2}>
                        <IrisMechanism />
                        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
                            <Particles />
                        </Float>
                        <Scroll html style={{ width: "100%" }}>
                            <AperturaContent />
                        </Scroll>
                    </ScrollControls>
                </Suspense>
            </Canvas>
        </div>
    );
}
```
