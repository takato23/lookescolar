"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScroll, MeshTransmissionMaterial } from "@react-three/drei";
import { APERTURA_CONFIG } from "./config";
import { useLandingState } from "./LandingState";

export function IrisMechanism() {
    const group = useRef<THREE.Group>(null);
    const bladesRef = useRef<THREE.Group[]>([]);
    const sensorLightRef = useRef<THREE.PointLight>(null);
    const scroll = useScroll();
    const { isOpening } = useLandingState();

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
            bevelSegments: 2
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

        // Scroll Choreography
        let targetAperture = 0;
        const s = scroll.offset;

        if (isOpening) {
            // Force open if transition is active
            targetAperture = 1;
        } else {
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
        }

        // Animate blades
        bladesRef.current.forEach((blade, i) => {
            if (blade) {
                const baseRotation = (i / bladeCount) * Math.PI * 2;
                // Smoothly interpolate to target aperture
                const currentAngle = blade.rotation.z - baseRotation;
                const targetAngle = THREE.MathUtils.lerp(0, -0.8, targetAperture);
                const angle = THREE.MathUtils.lerp(currentAngle, targetAngle, delta * 5);

                blade.rotation.z = baseRotation + angle;

                const targetDist = THREE.MathUtils.lerp(2.5, 3.5, targetAperture);
                // We can approximate current dist from angle or just lerp position directly
                // For simplicity, let's re-calculate based on the interpolated angle's implied aperture
                // But better to just lerp the aperture value itself if we stored it.
                // Since we don't store previous frame's aperture easily without a ref, let's just lerp the position to target
                const currentDist = Math.sqrt(blade.position.x ** 2 + blade.position.y ** 2);
                const dist = THREE.MathUtils.lerp(currentDist, targetDist, delta * 5);

                blade.position.x = Math.cos(baseRotation) * dist;
                blade.position.y = Math.sin(baseRotation) * dist;
            }
        });

        // Zoom effect when opening
        if (isOpening) {
            state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 0, delta * 2);
        }

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
            {/* A transparent cone simulating a light beam cutting across */}
            <mesh position={[3, 2, 1]} rotation={[0, 0, Math.PI / 5]}>
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
                <ringGeometry args={[3.5, 6, 64]} />
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
                <cylinderGeometry args={[2.8, 2.8, 0.3, 64]} />
                <MeshTransmissionMaterial
                    backside
                    samples={materials.glass.samples}
                    resolution={materials.glass.resolution}
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
