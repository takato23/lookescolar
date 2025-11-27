"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScroll } from "@react-three/drei";
import { APERTURA_CONFIG } from "./config";
import { useLandingState } from "./LandingState";

// ============================================================================
// PREMIUM EASING FUNCTIONS - Cinematic Motion Curves
// ============================================================================
const easing = {
    easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
    easeOutBack: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeOutElastic: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeInQuint: (t: number) => t * t * t * t * t,
    // Apple-inspired easing for ultra-smooth animations
    easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
};

export function IrisMechanism() {
    const group = useRef<THREE.Group>(null);
    const bladesRef = useRef<THREE.Group[]>([]);
    const sensorLightRef = useRef<THREE.PointLight>(null);
    const sensorMeshRef = useRef<THREE.Mesh>(null);
    const lensRef = useRef<THREE.Mesh>(null);
    const lensGlowRef = useRef<THREE.Mesh>(null);
    const scroll = useScroll();
    const { isOpening } = useLandingState();

    // Mobile detection for performance optimization
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Activity detection - typing and mouse movement triggers life response
    useEffect(() => {
        const handleActivity = () => {
            lifeStateRef.current.lastActivityTime = performance.now();
            lifeStateRef.current.activityPulse = Math.min(
                lifeStateRef.current.activityPulse + 0.15,
                1.0
            );
        };

        // Listen for typing anywhere on the page
        window.addEventListener('keydown', handleActivity);
        // Listen for mouse movement
        window.addEventListener('mousemove', handleActivity, { passive: true });
        // Listen for touch
        window.addEventListener('touchstart', handleActivity, { passive: true });

        return () => {
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, []);

    // State refs
    const tunnelProgressRef = useRef(0);
    const currentApertureRef = useRef(0);
    const cameraShakeRef = useRef({ x: 0, y: 0 });
    const lightPulseRef = useRef(0);

    // LIFE ANIMATION - Micro-movements for organic feel
    const lifeStateRef = useRef({
        // Breathing rhythm (multiple layered frequencies)
        breathPhase: 0,
        // Idle drift - subtle random wandering
        driftX: 0,
        driftY: 0,
        driftTargetX: 0,
        driftTargetY: 0,
        // Typing/interaction response
        activityPulse: 0,
        lastActivityTime: 0,
        // Scroll response
        scrollVelocity: 0,
        lastScrollOffset: 0,
    });

    // Light refs
    const tunnelLightRef = useRef<THREE.PointLight>(null);
    const coreLightRef = useRef<THREE.PointLight>(null);
    const rimLightLeftRef = useRef<THREE.PointLight>(null);
    const rimLightRightRef = useRef<THREE.PointLight>(null);
    const innerGlowRef = useRef<THREE.Mesh>(null);

    // Configuration - reduce blade count on mobile
    const bladeCount = isMobile ? 7 : 9;
    const { colors, materials, animation, lighting } = APERTURA_CONFIG;

    // ========================================================================
    // APERTURE BLADE GEOMETRY - Optimized for performance
    // ========================================================================
    const bladeGeometry = useMemo(() => {
        const shape = new THREE.Shape();

        // Optimized blade shape with smoother curves
        shape.moveTo(0, 0);
        shape.lineTo(1.0, 0.2);
        shape.quadraticCurveTo(1.8, 1.0, 1.5, 2.2);
        shape.quadraticCurveTo(1.1, 3.2, 0.4, 3.5);
        shape.lineTo(-0.1, 3.3);
        shape.quadraticCurveTo(-0.4, 2.2, -0.3, 1.2);
        shape.quadraticCurveTo(-0.15, 0.4, 0, 0);

        const extrudeSettings = {
            steps: 1,
            depth: 0.15,
            bevelEnabled: !isMobile, // Disable bevel on mobile for performance
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: isMobile ? 1 : 3
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, [isMobile]);

    // ========================================================================
    // MATERIALS - Optimized with performance flags
    // ========================================================================

    // Blade material - premium black metal with optimizations
    const bladeMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#1a1a1a",
            metalness: 0.95,
            roughness: 0.15,
            envMapIntensity: isMobile ? 2 : 4, // Reduce env map intensity on mobile
            side: THREE.DoubleSide,
        });
    }, [isMobile]);

    // Ring material - golden bronze with cinematic emissive
    const ringMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: colors.ring,
            metalness: 1,
            roughness: 0.2,
            envMapIntensity: isMobile ? 1 : 2,
            emissive: colors.ring,
            emissiveIntensity: 0.1
        });
    }, [colors.ring, isMobile]);

    // PERFORMANCE FIX: Memoize static geometries to prevent recreation every render
    const bladeHighlightGeometry = useMemo(() => new THREE.PlaneGeometry(0.08, 2.5), []);
    const bladeReflectionGeometry = useMemo(() => new THREE.PlaneGeometry(0.5, 1.8), []);

    // PERFORMANCE FIX: Cache math constants to avoid recalculation
    const mathPI2 = Math.PI * 2;

    // ========================================================================
    // MAIN ANIMATION LOOP
    // ========================================================================
    useFrame((state, delta) => {
        if (!group.current) return;

        const time = state.clock.elapsedTime;
        const s = scroll.offset;
        let targetAperture = 0;

        // ====================================================================
        // TUNNEL MODE
        // ====================================================================
        if (isOpening) {
            const speedMultiplier = 1 - tunnelProgressRef.current * 0.3;
            tunnelProgressRef.current = Math.min(
                tunnelProgressRef.current + delta * 0.45 * speedMultiplier,
                1
            );
            const t = tunnelProgressRef.current;

            // Multi-phase animation with Apple-quality easing
            const phase1 = Math.min(t * 2, 1);
            const phase2 = Math.max(0, (t - 0.3) / 0.7);
            const phase3 = Math.max(0, (t - 0.5) / 0.5);

            // Ultra-smooth easing transitions
            const easedAperture = easing.easeOutBack(phase1);
            const easedCamera = easing.easeInOutQuint(phase2); // Smoother camera movement
            const easedLight = easing.easeOutQuart(phase3);

            targetAperture = THREE.MathUtils.lerp(currentApertureRef.current, 1.5, easedAperture);

            // Camera movement - desde posición inicial real
            const startZ = 4; // Coincide con la posición de cámara en AperturaLanding
            const endZ = -10;
            state.camera.position.z = THREE.MathUtils.lerp(startZ, endZ, easedCamera);

            state.camera.fov = THREE.MathUtils.lerp(45, 100, easedCamera);
            state.camera.updateProjectionMatrix();

            // Cinematic camera shake with reduced intensity on mobile
            const shakeIntensity = Math.sin(t * Math.PI) * (isMobile ? 0.008 : 0.015);
            cameraShakeRef.current.x = THREE.MathUtils.lerp(cameraShakeRef.current.x, (Math.random() - 0.5) * shakeIntensity, 0.3);
            cameraShakeRef.current.y = THREE.MathUtils.lerp(cameraShakeRef.current.y, (Math.random() - 0.5) * shakeIntensity, 0.3);
            state.camera.position.x = cameraShakeRef.current.x;
            state.camera.position.y = cameraShakeRef.current.y;

            // Group transformations - desde scale base 0.85
            const baseScale = 0.85;
            const scale = THREE.MathUtils.lerp(baseScale, baseScale * 4, easedCamera);
            group.current.scale.set(scale, scale, baseScale);

            const rotationSpeed = 0.2 + easedCamera * 0.8;
            group.current.rotation.z += delta * rotationSpeed;

            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, delta * 6);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 6);

            // Lighting
            if (tunnelLightRef.current) {
                tunnelLightRef.current.intensity = THREE.MathUtils.lerp(0, 80, easedLight);
                tunnelLightRef.current.position.z = THREE.MathUtils.lerp(3, -15, easedCamera);
            }

            if (coreLightRef.current) {
                coreLightRef.current.intensity = THREE.MathUtils.lerp(0, 150, Math.pow(phase3, 1.5));
                coreLightRef.current.position.z = THREE.MathUtils.lerp(-2, -20, easedCamera);
            }

            const pulseFreq = 8 + t * 12;
            lightPulseRef.current = Math.sin(time * pulseFreq) * 0.5 + 0.5;

            if (rimLightLeftRef.current) {
                rimLightLeftRef.current.intensity = THREE.MathUtils.lerp(2, 12, easedLight);
            }
            if (rimLightRightRef.current) {
                rimLightRightRef.current.intensity = THREE.MathUtils.lerp(2, 12, easedLight);
            }

            if (innerGlowRef.current) {
                const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
                mat.opacity = THREE.MathUtils.lerp(0, 0.9, easedLight);
            }

            if (sensorMeshRef.current) {
                const mat = sensorMeshRef.current.material as THREE.MeshBasicMaterial;
                mat.opacity = THREE.MathUtils.lerp(1, 0, phase1);
            }

            // Lens glow durante tunnel
            if (lensGlowRef.current) {
                const mat = lensGlowRef.current.material as THREE.MeshBasicMaterial;
                mat.opacity = THREE.MathUtils.lerp(0.1, 0.5, easedLight);
            }

        } else {
            // ================================================================
            // NORMAL MODE - WITH ORGANIC LIFE ANIMATIONS
            // ================================================================
            tunnelProgressRef.current = 0;
            const life = lifeStateRef.current;

            // ============================================================
            // LIFE SYSTEM: Multi-layered organic breathing
            // ============================================================
            life.breathPhase += delta;

            // Detect scroll velocity for reactive response
            const scrollDelta = Math.abs(s - life.lastScrollOffset);
            life.scrollVelocity = THREE.MathUtils.lerp(
                life.scrollVelocity,
                scrollDelta * 50, // Amplify for visibility
                delta * 8
            );
            life.lastScrollOffset = s;

            // Decay activity pulse over time (creates "settling" after interaction)
            life.activityPulse = THREE.MathUtils.lerp(life.activityPulse, 0, delta * 1.5);

            // Update drift targets occasionally (random wandering)
            if (Math.random() < delta * 0.3) {
                life.driftTargetX = (Math.random() - 0.5) * 0.03;
                life.driftTargetY = (Math.random() - 0.5) * 0.03;
            }
            life.driftX = THREE.MathUtils.lerp(life.driftX, life.driftTargetX, delta * 0.5);
            life.driftY = THREE.MathUtils.lerp(life.driftY, life.driftTargetY, delta * 0.5);

            // Scroll-based aperture with cinematic easing + activity micro-pulse
            if (s < 0.2) {
                targetAperture = 0.0;
            } else if (s < 0.4) {
                const t = (s - 0.2) / 0.2;
                targetAperture = THREE.MathUtils.lerp(0.0, 0.4, easing.easeInOutQuint(t));
            } else if (s < 0.6) {
                targetAperture = 0.4;
            } else if (s < 0.8) {
                const t = (s - 0.6) / 0.2;
                targetAperture = THREE.MathUtils.lerp(0.4, 0.0, easing.easeInOutQuint(t));
            } else {
                targetAperture = 0.0;
            }

            // ============================================================
            // APERTURE BREATHING - The iris "adjusts" constantly like a real eye
            // ============================================================
            // Constant subtle opening/closing - like pupil dilation
            const aperturePulse = Math.sin(time * 0.8) * 0.04;
            // Faster micro-adjustments - like focusing
            const apertureMicro = Math.sin(time * 2.5) * 0.015;
            // Activity response - dilates when stimulated
            const activityTwitch = life.activityPulse * 0.08;
            // Scroll response - contracts slightly
            const scrollTwitch = life.scrollVelocity * 0.05;

            targetAperture += aperturePulse + apertureMicro + activityTwitch - scrollTwitch;

            // ============================================================
            // ROTATION: Organic rotation with multiple layers
            // ============================================================

            // Base rotation - varies speed for organic feel
            const baseRotationSpeed = 0.025 + Math.sin(time * 0.3) * 0.01;
            // Activity makes it spin noticeably faster
            const activityRotationBoost = life.activityPulse * 0.15;
            // Scroll velocity adds spin impulse
            const scrollRotationImpulse = life.scrollVelocity * 0.3;
            // Occasional "twitch" in rotation direction
            const rotationTwitch = Math.sin(time * 3.2) * 0.005;

            group.current.rotation.z += delta * (baseRotationSpeed + activityRotationBoost + scrollRotationImpulse + rotationTwitch);

            // Mouse following with STRONGER organic drift
            const targetRotationX = state.mouse.y * 0.25 + life.driftY * 2 + Math.sin(time * 0.7) * 0.03;
            const targetRotationY = state.mouse.x * 0.25 + life.driftX * 2 + Math.cos(time * 0.5) * 0.03;

            // Interpolation speed varies with activity
            const rotationLerpSpeed = 2.5 + life.activityPulse * 2;
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotationX, delta * rotationLerpSpeed);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotationY, delta * rotationLerpSpeed);

            // ============================================================
            // SCALE: Multi-frequency breathing (refined elegance)
            // ============================================================
            const baseScale = 0.85;

            // Primary breath - slow, deep, smooth
            const primaryBreath = Math.sin(time * 0.5) * 0.035;
            // Secondary breath - heartbeat undertone
            const secondaryBreath = Math.sin(time * 1.4) * 0.018;
            // Tertiary micro-tremor - subtle life
            const microTremor = Math.sin(time * 4) * 0.006;
            // Activity pulse - expands when user interacts
            const activityBreath = life.activityPulse * 0.045;
            // Scroll response - compression on scroll
            const scrollCompression = life.scrollVelocity * 0.02;

            const totalBreathing = 1 + primaryBreath + secondaryBreath + microTremor + activityBreath - scrollCompression;
            const finalScale = baseScale * totalBreathing;

            // Asymmetric scale - subtle organic wobble
            const asymmetry = Math.sin(time * 0.7) * 0.008;
            const asymmetry2 = Math.cos(time * 0.55) * 0.005;
            group.current.scale.set(
                finalScale + asymmetry,
                finalScale - asymmetry + asymmetry2,
                baseScale * (1 + microTremor * 0.3)
            );

            // ============================================================
            // POSITION: Elegant floating motion
            // ============================================================
            const floatX = Math.sin(time * 0.35) * 0.02 + Math.sin(time * 0.9) * 0.01;
            const floatY = Math.cos(time * 0.4) * 0.018 + Math.sin(time * 0.7) * 0.008;
            const floatZ = Math.sin(time * 0.25) * 0.012;

            group.current.position.x = floatX + life.driftX * 0.3;
            group.current.position.y = floatY + life.driftY * 0.3;
            group.current.position.z = floatZ;

            // ============================================================
            // LIGHTS: Refined breathing with activity response
            // ============================================================

            // Light breathing - elegant pulsing
            const lightBreath = 1 + primaryBreath * 1.5 + secondaryBreath + microTremor * 2;
            // Activity boost for lights
            const lightActivityBoost = 1 + life.activityPulse * 0.5;

            // Reset tunnel/core lights
            if (tunnelLightRef.current) {
                tunnelLightRef.current.intensity = THREE.MathUtils.lerp(tunnelLightRef.current.intensity, 0, delta * 4);
            }
            if (coreLightRef.current) {
                coreLightRef.current.intensity = THREE.MathUtils.lerp(coreLightRef.current.intensity, 0, delta * 4);
            }

            // Rim lights breathe elegantly
            if (rimLightLeftRef.current) {
                // Cyan light pulses with breathing
                const targetIntensity = (20 + primaryBreath * 10) * lightActivityBoost;
                rimLightLeftRef.current.intensity = THREE.MathUtils.lerp(rimLightLeftRef.current.intensity, targetIntensity, delta * 3);
            }
            if (rimLightRightRef.current) {
                // Orange light offset from cyan for "living" feel
                const offsetBreath = 1 + Math.sin(time * 0.5 + 1.2) * 0.2;
                const targetIntensity = (16 + secondaryBreath * 8) * offsetBreath * lightActivityBoost;
                rimLightRightRef.current.intensity = THREE.MathUtils.lerp(rimLightRightRef.current.intensity, targetIntensity, delta * 3);
            }

            // Inner glow pulses subtly with breathing
            if (innerGlowRef.current) {
                const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
                const breathGlow = Math.max(0, primaryBreath * 0.1 + life.activityPulse * 0.08);
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, breathGlow, delta * 3);
            }

            if (sensorMeshRef.current) {
                const mat = sensorMeshRef.current.material as THREE.MeshBasicMaterial;
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1, delta * 3);
            }

            // Lens glow - responsive but refined
            if (lensGlowRef.current) {
                const mat = lensGlowRef.current.material as THREE.MeshBasicMaterial;
                const baseGlow = 0.12;
                const breathGlow = (primaryBreath + secondaryBreath) * 0.2;
                const activityGlow = life.activityPulse * 0.25;
                const targetOpacity = baseGlow + breathGlow + activityGlow;
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, Math.min(targetOpacity, 0.45), delta * 4);
            }
        }

        // ====================================================================
        // APERTURE INTERPOLATION
        // ====================================================================
        currentApertureRef.current = THREE.MathUtils.lerp(
            currentApertureRef.current,
            targetAperture,
            delta * (isOpening ? 5 : 6)
        );
        const aperture = currentApertureRef.current;

        // ====================================================================
        // BLADE ANIMATION - Each blade has individual life
        // ====================================================================
        const minAperture = Math.min(aperture, 1);
        const bladeRotation = THREE.MathUtils.lerp(0.6, -1.5, minAperture);
        const closedRadius = 0.5;
        const openRadius = isOpening ? 12 : 3.5;
        const radius = THREE.MathUtils.lerp(closedRadius, openRadius, minAperture);

        // Life system reference for blade animations
        const life = lifeStateRef.current;

        bladesRef.current.forEach((blade, i) => {
            if (blade) {
                const baseAngle = (i / bladeCount) * mathPI2;

                // ============================================================
                // INDIVIDUAL BLADE MICRO-MOVEMENTS (refined)
                // ============================================================

                // Each blade has slightly offset timing (creates "wave" effect)
                const bladePhase = i * 0.35;

                // Individual blade "tremor" - subtle vibration
                const bladeTremor = Math.sin(time * 2.8 + bladePhase) * 0.005;

                // Breathing wave that travels around the iris - smooth
                const breathingWave = Math.sin(time * 0.6 + bladePhase * 0.4) * 0.008;

                // Mechanical "settling" micro-adjustments - very subtle
                const settling = Math.sin(time * 5 + bladePhase * 2) * 0.002;

                // Activity response - blades react when user interacts
                const activityTwitch = life.activityPulse * Math.sin(time * 10 + bladePhase) * 0.015;

                // Combined rotation with individual personality
                blade.rotation.z = baseAngle + bladeRotation + bladeTremor + breathingWave + settling + activityTwitch;

                // ============================================================
                // INDIVIDUAL BLADE POSITION VARIATIONS (refined)
                // ============================================================
                const cosAngle = Math.cos(baseAngle);
                const sinAngle = Math.sin(baseAngle);

                // Radius variation - subtle pulse in/out
                const radiusPulse = Math.sin(time * 0.9 + bladePhase) * 0.008;
                const radiusTremor = Math.sin(time * 3 + bladePhase * 1.5) * 0.003;
                const activityRadius = life.activityPulse * 0.02;
                const individualRadius = radius * (1 + radiusPulse + radiusTremor + activityRadius);

                blade.position.x = cosAngle * individualRadius;
                blade.position.y = sinAngle * individualRadius;

                // ============================================================
                // Z-DEPTH with micro-movements (refined)
                // ============================================================
                // Each blade floats slightly at different Z
                const zFloat = Math.sin(time * 0.7 + bladePhase * 0.6) * 0.005;
                const zTremor = Math.sin(time * 4 + bladePhase) * 0.0015;

                if (isOpening) {
                    const zOffset = THREE.MathUtils.lerp(0, -8, tunnelProgressRef.current);
                    blade.position.z = 0.2 + zOffset + zFloat;
                } else {
                    blade.position.z = 0.2 + zFloat + zTremor;
                }

                // ============================================================
                // BLADE SCALE - subtle individual breathing (refined)
                // ============================================================
                const bladeBreath = 1 + Math.sin(time * 0.5 + bladePhase) * 0.012;
                const bladeMicro = 1 + Math.sin(time * 2 + bladePhase * 2) * 0.005;
                blade.scale.setScalar(bladeBreath * bladeMicro);
            }
        });

        // Sensor light - Elegant pulsing with heartbeat undertone
        if (sensorLightRef.current && !isOpening) {
            const life = lifeStateRef.current;
            const baseIntensity = lighting.sensorIntensity;

            // Subtle heartbeat-like pulse
            const heartbeat1 = Math.pow(Math.max(0, Math.sin(time * 1.0)), 4) * 0.25;
            const heartbeat2 = Math.pow(Math.max(0, Math.sin(time * 1.0 + 0.25)), 4) * 0.12;
            // Breathing undertone
            const breathPulse = Math.sin(time * 0.45) * 0.1;
            // Activity surge
            const activityBoost = life.activityPulse * 0.4;

            const pulse = 1 + heartbeat1 + heartbeat2 + breathPulse + activityBoost;
            const targetIntensity = THREE.MathUtils.lerp(baseIntensity * 0.5, baseIntensity * 1.5, aperture) * pulse;
            sensorLightRef.current.intensity = THREE.MathUtils.lerp(
                sensorLightRef.current.intensity,
                targetIntensity,
                delta * 4
            );
        }

        // Lens refraction effect - Elegant micro-movements
        if (lensRef.current) {
            const life = lifeStateRef.current;
            // Base slow rotation
            const baseRotation = Math.sin(time * 0.4) * 0.025;
            // Wobble layers - refined
            const wobble1 = Math.sin(time * 1.3) * 0.01;
            const wobble2 = Math.cos(time * 2.0) * 0.006;
            // Activity makes lens respond subtly
            const activityWobble = life.activityPulse * Math.sin(time * 8) * 0.018;

            lensRef.current.rotation.z = baseRotation + wobble1 + wobble2 + activityWobble;
            // Subtle tilt
            lensRef.current.rotation.x = Math.sin(time * 0.35) * 0.012 + life.activityPulse * 0.012;
        }
    });

    // ========================================================================
    // SCENE
    // ========================================================================
    return (
        <group ref={group} position={[0, 0, 0]} scale={[0.85, 0.85, 0.85]}>
            {/* CINEMATIC LIGHTING RIG - Optimized for performance */}

            {/* Key Light - Dramatic top-down illumination */}
            <spotLight
                position={[2, 5, 8]}
                intensity={isMobile ? 60 : 80}
                color="#ffffff"
                angle={0.5}
                penumbra={0.6}
                distance={30}
                castShadow={!isMobile} // Disable shadows on mobile
            />

            {/* Fill Light - Soft shadow relief */}
            {!isMobile && (
                <spotLight
                    position={[-4, 2, 6]}
                    intensity={40}
                    color="#e8f4ff"
                    angle={0.7}
                    penumbra={0.8}
                    distance={25}
                />
            )}

            {/* Rim Light Left - Cinematic cyan edge */}
            <pointLight
                ref={rimLightLeftRef}
                position={[-5, 0, 2]}
                intensity={isMobile ? 18 : 25}
                color="#00d4ff"
                distance={15}
            />

            {/* Rim Light Right - Warm edge highlight */}
            <pointLight
                ref={rimLightRightRef}
                position={[5, 0, 2]}
                intensity={isMobile ? 15 : 20}
                color="#ff6600"
                distance={15}
            />

            {/* Back Light - Deep blue halo */}
            <pointLight
                position={[0, 0, -3]}
                intensity={isMobile ? 10 : 15}
                color="#0066ff"
                distance={10}
            />

            {/* Top Light - Definition and contour */}
            {!isMobile && (
                <pointLight
                    position={[0, 6, 4]}
                    intensity={30}
                    color="#ffffff"
                    distance={20}
                />
            )}

            {/* Ambient - Subtle base illumination */}
            <ambientLight intensity={isMobile ? 0.2 : 0.15} color="#4466aa" />

            {/* TUNNEL LIGHTS */}
            <pointLight
                ref={tunnelLightRef}
                position={[0, 0, 3]}
                intensity={0}
                color="#00ddff"
                distance={35}
                decay={1.5}
            />
            <pointLight
                ref={coreLightRef}
                position={[0, 0, -2]}
                intensity={0}
                color="#ffffff"
                distance={60}
                decay={1}
            />

            {/* ============================================================ */}
            {/* CAMERA LENS BODY */}
            {/* ============================================================ */}

            {/* Outer Ring - Lens body with optimized geometry */}
            <mesh position={[0, 0, -0.2]}>
                <torusGeometry args={[4.0, 0.7, isMobile ? 12 : 16, isMobile ? 48 : 64]} />
                <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.9}
                    roughness={0.3}
                />
            </mesh>

            {/* Inner Gold Ring */}
            <mesh position={[0, 0, 0]}>
                <ringGeometry args={[2.8, 3.2, isMobile ? 48 : 64]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* Marking Ring - Details */}
            <mesh position={[0, 0, 0.02]}>
                <ringGeometry args={[3.2, 3.4, isMobile ? 48 : 64]} />
                <meshStandardMaterial
                    color="#0d0d0d"
                    metalness={0.7}
                    roughness={0.4}
                />
            </mesh>

            {/* ============================================================ */}
            {/* GLASS LENS SYSTEM - Premium cinematográfico */}
            {/* ============================================================ */}

            {/* Lens principal - Premium glass with blue coating */}
            <mesh ref={lensRef} position={[0, 0, -0.3]}>
                <circleGeometry args={[2.5, isMobile ? 48 : 64]} />
                <meshPhysicalMaterial
                    color="#0a1520"
                    transparent
                    opacity={0.85}
                    metalness={0.1}
                    roughness={0.05}
                    clearcoat={isMobile ? 0.5 : 1} // Reduce clearcoat on mobile
                    clearcoatRoughness={0}
                    envMapIntensity={isMobile ? 1 : 2}
                />
            </mesh>

            {/* Refractive coating - Blue/purple gradient */}
            <mesh ref={lensGlowRef} position={[0, 0, -0.28]}>
                <ringGeometry args={[0.5, 2.5, isMobile ? 48 : 64]} />
                <meshBasicMaterial
                    color="#2266ff"
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Primary reflection - Light point */}
            <mesh position={[0.9, 0.9, -0.25]}>
                <circleGeometry args={[0.25, isMobile ? 24 : 32]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.7}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Secondary reflection */}
            {!isMobile && (
                <mesh position={[-0.4, -0.5, -0.26]}>
                    <circleGeometry args={[0.12, 32]} />
                    <meshBasicMaterial
                        color="#aaccff"
                        transparent
                        opacity={0.5}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Inner light ring - Soft glow */}
            <mesh position={[0, 0, -0.35]}>
                <ringGeometry args={[1.8, 2.2, isMobile ? 48 : 64]} />
                <meshBasicMaterial
                    color="#0088ff"
                    transparent
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Inner Glow for tunnel effect */}
            <mesh ref={innerGlowRef} position={[0, 0, -0.5]}>
                <circleGeometry args={[1.5, isMobile ? 48 : 64]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ============================================================ */}
            {/* SENSOR / DARK CENTER */}
            {/* ============================================================ */}

            <mesh ref={sensorMeshRef} position={[0, 0, -0.4]}>
                <circleGeometry args={[1.8, isMobile ? 48 : 64]} />
                <meshBasicMaterial color="#020204" transparent opacity={1} />
            </mesh>

            {/* Sensor glow */}
            <pointLight
                ref={sensorLightRef}
                position={[0, 0, -0.1]}
                intensity={lighting.sensorIntensity}
                color={colors.sensorLight}
                distance={5}
                decay={2}
            />

            {/* ============================================================ */}
            {/* APERTURE BLADES - 9 hojas premium */}
            {/* ============================================================ */}
            {Array.from({ length: bladeCount }).map((_, i) => (
                <group
                    key={i}
                    ref={(el) => { if (el) bladesRef.current[i] = el; }}
                >
                    {/* Hoja principal */}
                    <mesh
                        geometry={bladeGeometry}
                        material={bladeMaterial}
                        rotation={[0, 0, 0]}
                        scale={[1, 1, 1]}
                    />
                    {/* Borde especular - reflejo de luz principal */}
                    <mesh position={[0.6, 1.5, 0.16]} geometry={bladeHighlightGeometry}>
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.5}
                        />
                    </mesh>
                    {/* Reflejo cyan sutil */}
                    <mesh position={[0.3, 2.0, 0.14]} geometry={bladeReflectionGeometry}>
                        <meshBasicMaterial
                            color="#00aaff"
                            transparent
                            opacity={0.08}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
