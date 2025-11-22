"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Particles({ count = 150 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = new THREE.Object3D();

    // Generate random positions
    const particles = useRef(new Array(count).fill(0).map(() => ({
        position: new THREE.Vector3(
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 10 - 5 // Push back slightly to avoid camera clipping
        ),
        factor: Math.random() * 10 + 5,
        speed: Math.random() * 0.005 + 0.001 // Much slower, floating dust
    })));

    useFrame((state) => {
        if (!mesh.current) return;

        particles.current.forEach((particle, i) => {
            // Float animation
            let { position, factor, speed } = particle;
            const t = state.clock.elapsedTime;

            // Update Y position (floating up/down)
            dummy.position.copy(position);
            dummy.position.y += Math.sin(t * speed + factor) * 0.2;
            dummy.position.x += Math.cos(t * speed + factor) * 0.1;

            // Gentle rotation
            dummy.rotation.set(t * 0.05, t * 0.05, t * 0.02);

            // Scale breathing (random twinkling)
            const s = 0.3 + Math.sin(t * speed * 5 + factor) * 0.2;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });

        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.015, 0]} /> {/* Reduced size */}
            <meshStandardMaterial
                color="#ffd700"
                transparent
                opacity={0.4} // Reduced opacity
                roughness={0.5}
                metalness={1}
                emissive="#d4af37"
                emissiveIntensity={0.1}
            />
        </instancedMesh>
    );
}
