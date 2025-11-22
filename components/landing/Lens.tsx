"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useScroll, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

export function Lens() {
    const group = useRef<THREE.Group>(null);
    const scroll = useScroll();
    const { width, height } = useThree((state) => state.viewport);

    useFrame((state, delta) => {
        if (!group.current) return;

        // Base position (center)
        const targetPos = new THREE.Vector3(0, 0, 0);
        const targetRot = new THREE.Euler(0, 0, 0);
        const targetScale = new THREE.Vector3(1, 1, 1);

        // Phase 1: Move left, rotate (Features)
        if (scroll.offset < 0.33) {
            // Interpolate from center to left
            const t = scroll.range(0, 0.33);
            targetPos.x = THREE.MathUtils.lerp(0, -width * 0.25, t);
            targetRot.y = THREE.MathUtils.lerp(0, Math.PI / 4, t);
            targetRot.x = THREE.MathUtils.lerp(0, Math.PI / 8, t);
        }
        // Phase 2: Move right, zoom out (Global)
        else if (scroll.offset < 0.66) {
            const t = scroll.range(0.33, 0.33);
            targetPos.x = THREE.MathUtils.lerp(-width * 0.25, width * 0.25, t);
            targetRot.y = THREE.MathUtils.lerp(Math.PI / 4, -Math.PI / 4, t);
            targetScale.setScalar(THREE.MathUtils.lerp(1, 0.8, t));
        }
        // Phase 3: Center, close up (CTA)
        else {
            const t = scroll.range(0.66, 0.33);
            targetPos.x = THREE.MathUtils.lerp(width * 0.25, 0, t);
            targetRot.y = THREE.MathUtils.lerp(-Math.PI / 4, 0, t);
            targetRot.x = THREE.MathUtils.lerp(Math.PI / 8, 0, t);
            targetScale.setScalar(THREE.MathUtils.lerp(0.8, 1.2, t));
        }

        // Smooth dampening for scroll-based transforms
        group.current.position.lerp(targetPos, delta * 4);

        // Mouse interaction
        const mouseX = (state.mouse.x * width) / 2;
        const mouseY = (state.mouse.y * height) / 2;

        // Combine scroll rotation with mouse look-at
        // We want the lens to slightly look at the mouse
        const lookAtX = targetRot.x - mouseY * 0.05;
        const lookAtY = targetRot.y + mouseX * 0.05;

        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, lookAtX, delta * 4);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, lookAtY, delta * 4);

        group.current.scale.lerp(targetScale, delta * 4);

        // Constant subtle float
        group.current.position.y += Math.sin(state.clock.elapsedTime) * 0.05 * delta;
    });

    return (
        <group ref={group}>
            {/* Lens Ring (Metal) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.5, 0.15, 16, 100]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={1}
                />
            </mesh>

            {/* Inner Ring (Accent) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.3, 0.05, 16, 100]} />
                <meshStandardMaterial
                    color="#333"
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Lens Glass */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[1.4, 1.4, 0.2, 64]} />
                <MeshTransmissionMaterial
                    backside
                    samples={4}
                    thickness={0.5}
                    chromaticAberration={0.06}
                    anisotropy={0.1}
                    distortion={0.1}
                    distortionScale={0.1}
                    temporalDistortion={0.2}
                    ior={1.5}
                    color="#ffffff"
                    background={new THREE.Color('#000000')}
                />
            </mesh>

            {/* Lens Reflections / Details (Optional rings inside) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
                <ringGeometry args={[0.5, 0.55, 64]} />
                <meshBasicMaterial color="#444" opacity={0.5} transparent />
            </mesh>

            {/* Shutter Mechanism */}
            <Shutter scroll={scroll} />
        </group>
    );
}

function Shutter({ scroll }: { scroll: any }) {
    const blades = useRef<THREE.Group[]>([]);
    const count = 8;

    useFrame(() => {
        // Close shutter at the end (Phase 3)
        // Range from 0.66 to 1
        const t = scroll.range(0.66, 0.33);
        const angle = THREE.MathUtils.lerp(0, Math.PI / 2.5, t);

        blades.current.forEach((blade, i) => {
            if (blade) {
                blade.rotation.z = angle;
            }
        });
    });

    return (
        <group position={[0, 0, 0.1]} rotation={[0, 0, 0]}>
            {Array.from({ length: count }).map((_, i) => (
                <group
                    key={i}
                    rotation={[0, 0, (i / count) * Math.PI * 2]}
                    ref={(el) => { if (el) blades.current[i] = el; }}
                >
                    <mesh position={[0.6, 0.2, 0]} rotation={[0, 0, 0.2]}>
                        <planeGeometry args={[1.2, 0.8]} />
                        <meshStandardMaterial
                            color="#111"
                            metalness={0.8}
                            roughness={0.2}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
