"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useScroll } from "framer-motion";
import { Loader } from "@react-three/drei";

const PlanningScene = dynamic(() => import("./PlanningScene"), { ssr: false });
import PlanningOverlay from "./PlanningOverlay";

export default function PlanningPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    return (
        <main ref={containerRef} className="relative w-full min-h-screen bg-white">
            <PlanningScene scrollProgress={scrollYProgress} />
            <PlanningOverlay />
            <Loader />
        </main>
    );
}
