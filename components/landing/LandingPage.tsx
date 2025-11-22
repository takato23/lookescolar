"use client";

import { Canvas } from "@react-three/fiber";
import { ScrollControls, Scroll, Environment, Float } from "@react-three/drei";
import { Lens } from "./Lens";
import { OverlayContent } from "./OverlayContent";
import { Particles } from "./Particles";
import { Suspense } from "react";

export default function LandingPage() {
    return (
        <div
            className="h-screen w-full bg-black bg-cover bg-center"
            style={{ backgroundImage: "url('/images/background-texture.png')" }}
        >
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                <Environment preset="city" />

                <Suspense fallback={null}>
                    <ScrollControls pages={4} damping={0.2}>
                        {/* 3D Content Layer */}
                        <Scroll>
                            <Float
                                speed={2}
                                rotationIntensity={0.5}
                                floatIntensity={0.5}
                            >
                                <Lens />
                            </Float>
                            <Particles count={150} />
                        </Scroll>

                        {/* HTML Content Layer */}
                        <Scroll html style={{ width: '100%' }}>
                            <OverlayContent />
                        </Scroll>
                    </ScrollControls>
                </Suspense>
            </Canvas>
        </div>
    );
}
