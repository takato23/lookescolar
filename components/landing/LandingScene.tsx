"use client";

import { ScrollControls, Scroll, Environment, Float } from "@react-three/drei";
import { Lens } from "./Lens";
import { OverlayContent } from "./OverlayContent";
import { Particles } from "./Particles";
import { Suspense } from "react";

export default function LandingScene() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            <Environment files="/assets/apertura_studio.hdr" />

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
        </>
    );
}
