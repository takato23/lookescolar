"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLandingState } from "./LandingState";

// ============================================================================
// PREMIUM PARTICLE SYSTEM - Optimized for performance
// Dual-mode particles: ambient floating + tunnel warp effect
// ============================================================================

interface ParticleData {
    position: THREE.Vector3;
    basePosition: THREE.Vector3;
    velocity: THREE.Vector3;
    factor: number;
    speed: number;
    size: number;
    type: 'dust' | 'spark' | 'streak';
}

export function Particles({ count = 200 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { isOpening } = useLandingState();

    // Mobile detection for performance optimization
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track tunnel progress locally
    const tunnelProgress = useRef(0);
    const particleBoost = useRef(0);

    // Generate particles with different types - reduce count on mobile
    const particles = useRef<ParticleData[]>(
        new Array(count).fill(0).map((_, i) => {
            const type: ParticleData['type'] = i < count * 0.6 ? 'dust' : i < count * 0.85 ? 'spark' : 'streak';
            const radius = type === 'streak' ? 8 + Math.random() * 15 : (Math.random() - 0.5) * 30;
            const angle = Math.random() * Math.PI * 2;

            return {
                position: new THREE.Vector3(
                    type === 'streak' ? Math.cos(angle) * radius : (Math.random() - 0.5) * 30,
                    type === 'streak' ? Math.sin(angle) * radius : (Math.random() - 0.5) * 30,
                    type === 'streak' ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 15 - 5
                ),
                basePosition: new THREE.Vector3(
                    type === 'streak' ? Math.cos(angle) * radius : (Math.random() - 0.5) * 30,
                    type === 'streak' ? Math.sin(angle) * radius : (Math.random() - 0.5) * 30,
                    type === 'streak' ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 15 - 5
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02,
                    type === 'streak' ? -0.5 - Math.random() * 0.5 : (Math.random() - 0.5) * 0.01
                ),
                factor: Math.random() * 10 + 5,
                speed: Math.random() * 0.005 + 0.001,
                size: type === 'dust' ? 0.01 + Math.random() * 0.02 :
                      type === 'spark' ? 0.02 + Math.random() * 0.03 :
                      0.005 + Math.random() * 0.01,
                type
            };
        })
    );

    // Performance optimization: Cache frequently used calculations
    const delta60 = useRef(0);
    const frameSkip = useRef(0);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        // Skip frames on mobile for better performance
        if (isMobile) {
            frameSkip.current++;
            if (frameSkip.current % 2 !== 0) return; // Update every other frame on mobile
        }

        const t = state.clock.elapsedTime;

        // Cache delta * 60 calculation used multiple times
        delta60.current = delta * 60;

        // Update tunnel progress with smoother transitions
        if (isOpening) {
            tunnelProgress.current = Math.min(tunnelProgress.current + delta * 0.5, 1);
            particleBoost.current = Math.min(particleBoost.current + delta * 2, 1);
        } else {
            tunnelProgress.current = Math.max(tunnelProgress.current - delta * 2, 0);
            particleBoost.current = Math.max(particleBoost.current - delta * 3, 0);
        }

        const tp = tunnelProgress.current;
        const boost = particleBoost.current;

        particles.current.forEach((particle, i) => {
            const { basePosition, velocity, factor, speed, size, type } = particle;

            if (isOpening && boost > 0.1) {
                // ================================================================
                // TUNNEL MODE: Warp speed effect
                // ================================================================

                if (type === 'streak') {
                    // Streaks fly past camera rapidly - optimized with cached delta60
                    particle.position.z += velocity.z * (10 + boost * 30) * delta60.current;

                    // Reset if too far
                    if (particle.position.z < -30) {
                        particle.position.z = 20 + Math.random() * 20;
                    }

                    // Elongate streaks based on speed
                    const elongation = 1 + boost * 8;
                    dummy.scale.set(size, size, size * elongation);
                } else {
                    // Performance optimization: Cache angle calculation
                    const angle = Math.atan2(particle.position.y, particle.position.x);

                    // Dust and sparks get pulled toward center then explode outward
                    const pullStrength = Math.sin(tp * Math.PI) * 0.3;
                    const radialDist = Math.sqrt(
                        particle.position.x ** 2 + particle.position.y ** 2
                    );

                    // Precompute trig values for performance
                    const cosAngle = Math.cos(angle);
                    const sinAngle = Math.sin(angle);

                    // Pull toward center in first half, explode outward in second
                    if (tp < 0.5) {
                        particle.position.x -= cosAngle * pullStrength * radialDist * delta * 2;
                        particle.position.y -= sinAngle * pullStrength * radialDist * delta * 2;
                    } else {
                        // Explosion outward
                        const explosionForce = (tp - 0.5) * 4;
                        particle.position.x += cosAngle * explosionForce * delta * 5;
                        particle.position.y += sinAngle * explosionForce * delta * 5;
                    }

                    // All particles rush toward camera
                    particle.position.z -= (5 + boost * 20) * delta;

                    // Reset if behind camera
                    if (particle.position.z < -15) {
                        particle.position.z = 10 + Math.random() * 15;
                        particle.position.x = basePosition.x;
                        particle.position.y = basePosition.y;
                    }

                    dummy.scale.set(size * (1 + boost), size * (1 + boost), size * (1 + boost * 3));
                }

                // Faster rotation during tunnel
                dummy.rotation.set(
                    t * 0.5 + factor,
                    t * 0.3 + factor,
                    t * 0.2 + factor
                );

            } else {
                // ================================================================
                // AMBIENT MODE: Gentle floating with cinematic motion
                // ================================================================

                // Return to base position gradually with smoother interpolation
                particle.position.lerp(basePosition, delta * 0.5);

                // Float animation with organic motion
                dummy.position.copy(particle.position);
                dummy.position.y += Math.sin(t * speed + factor) * 0.3;
                dummy.position.x += Math.cos(t * speed * 0.7 + factor) * 0.2;
                dummy.position.z += Math.sin(t * speed * 0.5 + factor * 0.5) * 0.1;

                // Gentle rotation for natural movement
                dummy.rotation.set(t * 0.05, t * 0.05, t * 0.02);

                // Scale breathing (twinkling effect)
                const breathe = Math.sin(t * speed * 5 + factor) * 0.3 + 0.7;
                dummy.scale.set(size * breathe, size * breathe, size * breathe);
            }

            dummy.position.copy(particle.position);
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });

        mesh.current.instanceMatrix.needsUpdate = true;
    });

    // Optimized material with mobile-friendly settings
    const particleMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#ffd700",
            transparent: true,
            opacity: isMobile ? 0.4 : 0.5, // Slightly more transparent on mobile
            roughness: 0.3,
            metalness: 1,
            emissive: "#ffaa00",
            emissiveIntensity: isMobile ? 0.2 : 0.3
        });
    }, [isMobile]);

    return (
        <group>
            {/* Main particle mesh with instancing for performance */}
            <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
                <dodecahedronGeometry args={[1, 0]} />
                <primitive object={particleMaterial} />
            </instancedMesh>
        </group>
    );
}

// ============================================================================
// TUNNEL SPEED LINES - Optimized for mobile
// ============================================================================
export function TunnelSpeedLines({ count = 100 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { isOpening } = useLandingState();
    const activeRef = useRef(0);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const lines = useRef(
        new Array(count).fill(0).map(() => {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 12;
            return {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: Math.random() * 40 - 20,
                speed: 0.5 + Math.random() * 1,
                length: 0.5 + Math.random() * 2
            };
        })
    );

    const frameSkip = useRef(0);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        // Skip frames on mobile
        if (isMobile) {
            frameSkip.current++;
            if (frameSkip.current % 2 !== 0) return;
        }

        // Smooth activation with cinematic easing
        if (isOpening) {
            activeRef.current = Math.min(activeRef.current + delta * 2, 1);
        } else {
            activeRef.current = Math.max(activeRef.current - delta * 4, 0);
        }

        const active = activeRef.current;

        lines.current.forEach((line, i) => {
            if (active > 0.1) {
                // Move lines toward camera with warp effect
                line.z -= line.speed * active * delta * 80;

                // Reset when past camera
                if (line.z < -25) {
                    line.z = 20 + Math.random() * 20;
                }

                dummy.position.set(line.x, line.y, line.z);
                dummy.scale.set(0.02, 0.02, line.length * active * 3);
                dummy.lookAt(0, 0, line.z - 10);
            } else {
                // Hide when inactive
                dummy.scale.set(0, 0, 0);
            }

            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });

        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
                color="#88ddff"
                transparent
                opacity={isMobile ? 0.5 : 0.6}
                blending={THREE.AdditiveBlending}
            />
        </instancedMesh>
    );
}
