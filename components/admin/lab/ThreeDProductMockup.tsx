'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import { Box, RotateCw } from 'lucide-react';

function RotatingFrame(props: any) {
    const meshRef = useRef<any>();

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} {...props}>
                <boxGeometry args={[3, 4, 0.2]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.8} />
                <mesh position={[0, 0, 0.11]}>
                    <planeGeometry args={[2.6, 3.6]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.5} />
                </mesh>
            </mesh>
        </Float>
    );
}

export default function ThreeDProductMockup() {
    const [isInteracting, setIsInteracting] = useState(false);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                        <Box className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">3D Preview</h3>
                        <p className="text-sm text-slate-400">Interactive products</p>
                    </div>
                </div>
            </div>

            <div
                className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-800 to-slate-900"
                onMouseEnter={() => setIsInteracting(true)}
                onMouseLeave={() => setIsInteracting(false)}
            >
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <RotatingFrame />
                    <Environment preset="city" />
                    <OrbitControls autoRotate={!isInteracting} autoRotateSpeed={4} enableZoom={false} />
                </Canvas>

                <div className="absolute bottom-4 right-4 rounded-full bg-black/50 p-2 backdrop-blur-sm">
                    <RotateCw className={`h-5 w-5 text-white/70 transition-all ${!isInteracting ? 'animate-spin-slow' : ''}`} />
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Material</span>
                    <span className="font-medium text-white">Brushed Aluminum</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-2/3 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                </div>
            </div>
        </div>
    );
}
