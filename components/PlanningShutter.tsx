"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { APERTURA_CONFIG } from "./landing/config";
import { MotionValue } from "framer-motion";

export function PlanningShutter({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
    const group = useRef<THREE.Group>(null);
    const bladesRef = useRef<THREE.Group[]>([]);
    const sensorLightRef = useRef<THREE.PointLight>(null);
    const volumetricRef = useRef<THREE.Mesh>(null);

    // Configuration
    const bladeCount = 12;
    const { colors, materials, animation, lighting } = APERTURA_CONFIG;

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
            bevelSegments: 1
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, []);

    // Material for the blades (Premium Metal)
    const bladeMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: colors.blade,
            metalness: materials.blade.metalness,
            roughness: materials.blade.roughness,
            envMapIntensity: materials.blade.envMapIntensity,
            side: THREE.DoubleSide
        });
    }, [colors.blade, materials.blade]);

    // Material for the ring (Brushed Gold/Bronze accent)
    const ringMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: colors.ring,
            metalness: materials.ring.metalness,
            roughness: materials.ring.roughness,
            envMapIntensity: materials.ring.envMapIntensity,
        });
    }, [colors.ring, materials.ring]);

    useFrame((state, delta) => {
        if (!group.current) return;

        // Direct scroll calculation for instant responsiveness
        // Fallback to 0 if window is not defined (SSR)
        let scroll = 0;
        if (typeof window !== 'undefined') {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            scroll = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
        } else {
            scroll = scrollProgress.get();
        }

        // Rotate Volumetric Ray
        if (volumetricRef.current) {
            volumetricRef.current.rotation.z += delta * 0.05;
        }

        // Scroll Choreography
        let targetAperture = 0;

        // Map scroll to aperture
        // 0-0.25: Closed / Breathing
        // 0.25-0.5: Opening slightly
        // 0.5-0.75: Fully Open
        // 0.75-1: Zoom / Transition

        if (scroll < 0.25) {
            targetAperture = THREE.MathUtils.lerp(0.1, 0.2, scroll * 4);
        } else if (scroll < 0.5) {
            const t = (scroll - 0.25) * 4;
            targetAperture = THREE.MathUtils.lerp(0.2, 0.8, t);
        } else if (scroll < 0.75) {
            const t = (scroll - 0.5) * 4;
            targetAperture = THREE.MathUtils.lerp(0.8, 1, t);
        } else {
            targetAperture = 1;
        }

        // Animate blades
        bladesRef.current.forEach((blade, i) => {
            if (blade) {
                const baseRotation = (i / bladeCount) * Math.PI * 2;
                // Smoothly interpolate to target aperture
                const targetAngle = THREE.MathUtils.lerp(0, -0.8, targetAperture);

                // Direct mapping for responsiveness, or lerp for smoothness
                // Using lerp for smoothness
                const currentAngle = blade.rotation.z - baseRotation;
                const angle = THREE.MathUtils.lerp(currentAngle, targetAngle, delta * 5);

                blade.rotation.z = baseRotation + angle;

                const targetDist = THREE.MathUtils.lerp(2.5, 3.5, targetAperture);
                const currentDist = Math.sqrt(blade.position.x ** 2 + blade.position.y ** 2);
                const dist = THREE.MathUtils.lerp(currentDist, targetDist, delta * 5);

                blade.position.x = Math.cos(baseRotation) * dist;
                blade.position.y = Math.sin(baseRotation) * dist;
            }
        });

        // Rotate the whole mechanism slightly for dynamism
        group.current.rotation.z += delta * 0.05;

        // Breathing Animation (Subtle scale pulse)
        const breathing = Math.sin(state.clock.elapsedTime * animation.breathingSpeed) * animation.breathingIntensity + 1;
        group.current.scale.set(breathing, breathing, 1);

        // MOUSE TILT (Subtle)
        const tiltX = (state.mouse.y * animation.tiltSensitivity);
        const tiltY = (state.mouse.x * animation.tiltSensitivity);
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, tiltX, delta * 2);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, tiltY, delta * 2);

        // Animate Sensor Light
        if (sensorLightRef.current) {
            // Intensity increases as aperture opens
            const baseIntensity = lighting.sensorIntensity;
            const targetIntensity = THREE.MathUtils.lerp(baseIntensity * 0.5, baseIntensity * 2, targetAperture);
            sensorLightRef.current.intensity = THREE.MathUtils.lerp(sensorLightRef.current.intensity, targetIntensity, delta * 2);
        }
    });

    return (
        <group ref={group} position={[0, 0, 0]}>
            {/* CINEMATIC LIGHTING SETUP */}

            {/* 1. Strong Lateral Beam (Top Right) - Key Light */}
            <spotLight
                position={[8, 4, 6]}
                intensity={lighting.spotIntensity}
                color="#ffffff"
                angle={0.25}
                penumbra={0.4}
                distance={40}
                castShadow
            />

            {/* 2. Cool Rim Light (Back Left) - Edge Definition */}
            <pointLight position={[-6, 3, -3]} intensity={lighting.rimIntensity} color={colors.rimLight} distance={20} />

            {/* 3. Soft Fill (Bottom) - Detail visibility */}
            <pointLight position={[0, -6, 3]} intensity={lighting.fillIntensity} color={colors.fillLight} distance={15} />

            {/* VOLUMETRIC RAY MESH */}
            <mesh
                ref={volumetricRef}
                position={[3, 2, 1]}
                rotation={[0, 0, Math.PI / 5]}
            >
                <cylinderGeometry args={[0.2, 5, 20, 32, 1, true]} />
                <meshBasicMaterial
                    color={colors.volumetric}
                    transparent
                    opacity={0.04}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Outer Ring / Body */}
            <mesh position={[0, 0, -0.1]}>
                <ringGeometry args={[3.5, 6, 48]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* Sensor Core (Black Hole / Sensor) */}
            <mesh position={[0, 0, -0.5]}>
                <circleGeometry args={[2, 64]} />
                <meshBasicMaterial color={colors.sensor} />
            </mesh>

            {/* Sensor Light Glow */}
            <pointLight ref={sensorLightRef} position={[0, 0, -0.2]} intensity={lighting.sensorIntensity} color={colors.sensorLight} distance={4} decay={2} />

            {/* Liquid Glass Lens */}
            <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.8, 2.8, 0.3, 32]} />
                <MeshTransmissionMaterial
                    backside
                    samples={2} // Reduced from 4
                    resolution={128} // Reduced from 256
                    thickness={materials.glass.thickness}
                    chromaticAberration={materials.glass.chromaticAberration}
                    anisotropy={materials.glass.anisotropy}
                    distortion={materials.glass.distortion}
                    distortionScale={materials.glass.distortionScale}
                    temporalDistortion={materials.glass.temporalDistortion}
                    ior={materials.glass.ior}
                    color={materials.glass.color}
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
