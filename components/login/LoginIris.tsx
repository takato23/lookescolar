"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
    Group,
    Mesh,
    Shape,
    ExtrudeGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    DoubleSide,
    AdditiveBlending,
    MathUtils,
} from "three";
import { APERTURA_CONFIG } from "@/components/landing/config";

interface LoginIrisProps {
    isReady?: boolean;
}

export function LoginIris({ isReady = false }: LoginIrisProps) {
    const group = useRef<Group>(null);
    const bladesRef = useRef<Group[]>([]);
    const lensGlowRef = useRef<Mesh>(null);
    const { invalidate } = useThree();

    // Configuration - 9 hojas como en el landing
    const bladeCount = 9;
    const { colors, animation } = APERTURA_CONFIG;

    // Animation State
    const apertureRef = useRef(0);
    const initialAnimationRef = useRef(0);
    const needsUpdateRef = useRef(true);

    // Create blade geometry - mismo que el landing
    const bladeGeometry = useMemo(() => {
        const shape = new Shape();
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
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 3
        };

        return new ExtrudeGeometry(shape, extrudeSettings);
    }, []);

    // Material de las hojas - mismo estilo premium
    const bladeMaterial = useMemo(() => {
        return new MeshStandardMaterial({
            color: "#1a1a1a",
            metalness: 0.95,
            roughness: 0.15,
            envMapIntensity: 4,
            side: DoubleSide,
        });
    }, []);

    // Material del anillo exterior
    const ringMaterial = useMemo(() => {
        return new MeshStandardMaterial({
            color: colors.ring,
            metalness: 1,
            roughness: 0.2,
            envMapIntensity: 2,
            emissive: colors.ring,
            emissiveIntensity: 0.1
        });
    }, [colors.ring]);

    useFrame((state, delta) => {
        if (!group.current) return;

        const time = state.clock.elapsedTime;
        let hasChanged = false;

        // Animación de entrada - se abre gradualmente
        if (isReady && initialAnimationRef.current < 1) {
            initialAnimationRef.current = Math.min(initialAnimationRef.current + delta * 1.2, 1);
            hasChanged = true;
        }

        // El iris está siempre abierto en login (apertura ~0.65 para mejor visibilidad)
        const targetAperture = 0.65 * initialAnimationRef.current;
        const previousAperture = apertureRef.current;
        apertureRef.current = MathUtils.lerp(apertureRef.current, targetAperture, delta * 2.5);
        const aperture = apertureRef.current;

        if (Math.abs(aperture - previousAperture) > 0.001) {
            hasChanged = true;
        }

        // Animate blades - optimizado
        bladesRef.current.forEach((blade, i) => {
            if (blade) {
                const baseAngle = (i / bladeCount) * Math.PI * 2;
                const bladeRotation = MathUtils.lerp(0.6, -1.3, aperture);
                blade.rotation.z = baseAngle + bladeRotation;

                const closedRadius = 0.5;
                const openRadius = 3.2;
                const radius = MathUtils.lerp(closedRadius, openRadius, aperture);

                blade.position.x = Math.cos(baseAngle) * radius;
                blade.position.y = Math.sin(baseAngle) * radius;
                blade.position.z = 0.2;
            }
        });

        // Rotación muy lenta y suave
        group.current.rotation.z += delta * 0.012;
        if (group.current.rotation.z > Math.PI * 2) {
            group.current.rotation.z -= Math.PI * 2;
        }
        hasChanged = true;

        // Seguimiento del mouse - más suave y responsive
        const targetRotationX = state.mouse.y * 0.15;
        const targetRotationY = state.mouse.x * 0.15;
        const prevRotX = group.current.rotation.x;
        const prevRotY = group.current.rotation.y;

        group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, targetRotationX, delta * 2);
        group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, targetRotationY, delta * 2);

        if (Math.abs(group.current.rotation.x - prevRotX) > 0.001 ||
            Math.abs(group.current.rotation.y - prevRotY) > 0.001) {
            hasChanged = true;
        }

        // Breathing sutil pero visible
        const breathing = Math.sin(time * animation.breathingSpeed * 0.6) * 0.02 + 1;
        group.current.scale.set(breathing, breathing, 1);

        // Lens glow pulse mejorado
        if (lensGlowRef.current) {
            const mat = lensGlowRef.current.material as MeshBasicMaterial;
            const newOpacity = 0.25 + Math.sin(time * 1.5) * 0.08;
            if (Math.abs(mat.opacity - newOpacity) > 0.01) {
                mat.opacity = newOpacity;
                hasChanged = true;
            }
        }

        // Request next frame only if something changed
        if (hasChanged || needsUpdateRef.current) {
            needsUpdateRef.current = false;
            invalidate();
        }
    });

    return (
        <group ref={group} position={[0, 0, -2]} scale={[0.7, 0.7, 0.7]}>
            {/* LIGHTING RIG - Consistente con landing */}

            {/* Key Light */}
            <spotLight
                position={[2, 5, 8]}
                intensity={60}
                color="#ffffff"
                angle={0.5}
                penumbra={0.6}
                distance={30}
            />

            {/* Fill Light */}
            <spotLight
                position={[-4, 2, 6]}
                intensity={30}
                color="#e8f4ff"
                angle={0.7}
                penumbra={0.8}
                distance={25}
            />

            {/* Rim Lights */}
            <pointLight position={[-5, 0, 2]} intensity={20} color="#00d4ff" distance={15} />
            <pointLight position={[5, 0, 2]} intensity={15} color="#ff6600" distance={15} />

            {/* Back Light */}
            <pointLight position={[0, 0, -3]} intensity={12} color="#0066ff" distance={10} />

            {/* Ambient */}
            <ambientLight intensity={0.12} color="#4466aa" />

            {/* Outer Ring */}
            <mesh position={[0, 0, -0.2]}>
                <torusGeometry args={[4.0, 0.7, 16, 64]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.3} />
            </mesh>

            {/* Inner Gold Ring */}
            <mesh position={[0, 0, 0]}>
                <ringGeometry args={[2.8, 3.2, 64]} />
                <primitive object={ringMaterial} />
            </mesh>

            {/* GLASS LENS */}
            <mesh position={[0, 0, -0.3]}>
                <circleGeometry args={[2.5, 64]} />
                <meshPhysicalMaterial
                    color="#0a1520"
                    transparent
                    opacity={0.85}
                    metalness={0.1}
                    roughness={0.05}
                    clearcoat={1}
                    clearcoatRoughness={0}
                    envMapIntensity={2}
                />
            </mesh>

            {/* Lens Glow */}
            <mesh ref={lensGlowRef} position={[0, 0, -0.28]}>
                <ringGeometry args={[0.5, 2.5, 64]} />
                <meshBasicMaterial
                    color="#2266ff"
                    transparent
                    opacity={0.2}
                    blending={AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Reflejo de luz */}
            <mesh position={[0.9, 0.9, -0.25]}>
                <circleGeometry args={[0.2, 32]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.6}
                    blending={AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Sensor oscuro */}
            <mesh position={[0, 0, -0.4]}>
                <circleGeometry args={[1.5, 64]} />
                <meshBasicMaterial color="#020204" transparent opacity={0.9} />
            </mesh>

            {/* APERTURE BLADES */}
            {Array.from({ length: bladeCount }).map((_, i) => (
                <group
                    key={i}
                    ref={(el) => { if (el) bladesRef.current[i] = el; }}
                >
                    <mesh
                        geometry={bladeGeometry}
                        material={bladeMaterial}
                        rotation={[0, 0, 0]}
                        scale={[1, 1, 1]}
                    />
                    {/* Borde especular */}
                    <mesh position={[0.6, 1.5, 0.16]}>
                        <planeGeometry args={[0.08, 2.5]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
