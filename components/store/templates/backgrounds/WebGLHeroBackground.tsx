'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface WebGLHeroBackgroundProps {
  className?: string;
}

function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  const orbs = useMemo(
    () => [
      { position: [-2.4, 0.4, -0.6], color: '#60a5fa', scale: 1.4 },
      { position: [1.8, -0.6, -1.2], color: '#f472b6', scale: 1.1 },
      { position: [0.6, 1.2, -0.3], color: '#a78bfa', scale: 0.9 },
    ],
    []
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.08;
      groupRef.current.rotation.x = time * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, index) => (
        <mesh key={index} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={orb.color}
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function WebGLHeroBackground({ className }: WebGLHeroBackgroundProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl', { powerPreference: 'low-power' }) ||
      canvas.getContext('experimental-webgl');
    if (gl) {
      setEnabled(true);
    }
  }, []);

  if (!enabled) {
    return (
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.18),transparent_55%)]',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 3, 6]} intensity={0.8} />
        <FloatingOrbs />
      </Canvas>
    </div>
  );
}

