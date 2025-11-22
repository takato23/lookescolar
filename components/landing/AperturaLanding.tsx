"use client";

import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Environment, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { IrisMechanism } from "./IrisMechanism";
import { AperturaContent } from "./AperturaContent";
import { Particles } from "./Particles";
import { Suspense } from "react";
import { APERTURA_CONFIG } from "./config";

import { useRouter } from "next/navigation";

export default function AperturaLanding() {
    const { postProcessing } = APERTURA_CONFIG;
    const router = useRouter();

    const handleNavigate = (path: string) => {
        router.push(path);
    };

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            {/* Background Texture (Optional) */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none z-0"
                style={{
                    backgroundImage: "url('/images/background-texture.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

            <Canvas
                key="apertura-canvas" // Fix: Prevent double createRoot in development
                camera={{ position: [0, 0, 5], fov: 35 }}
                gl={{ antialias: false, alpha: true }} // Keep AA off for postprocessing, but enable depth/stencil
                dpr={[1, 2]}
            >
                <Suspense fallback={null}>
                    <Environment preset="studio" />

                    <ScrollControls pages={5} damping={0.2}>
                        {/* 3D Layer */}
                        <IrisMechanism />

                        {/* Atmospheric Particles */}
                        <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
                            <Particles />
                        </Float>

                        {/* HTML Layer */}
                        <Scroll html style={{ width: "100%" }}>
                            <AperturaContent onNavigate={handleNavigate} />
                        </Scroll>
                    </ScrollControls>

                    {/* POST PROCESSING */}
                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={postProcessing.bloom.luminanceThreshold}
                            mipmapBlur
                            intensity={postProcessing.bloom.intensity}
                            radius={postProcessing.bloom.radius}
                        />
                        <Vignette
                            eskil={false}
                            offset={postProcessing.vignette.offset}
                            darkness={postProcessing.vignette.darkness}
                        />
                    </EffectComposer>
                </Suspense>
            </Canvas>
        </div>
    );
}
