"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export const MagneticButton = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current!.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        setPosition({ x: middleX, y: middleY });
    };

    const reset = () => {
        setPosition({ x: 0, y: 0 });
    };

    const { x, y } = position;

    return (
        <div className="flex h-64 w-full items-center justify-center rounded-xl bg-neutral-900">
            <motion.div
                style={{ position: "relative" }}
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={reset}
                animate={{ x, y }}
                transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            >
                <button className="relative overflow-hidden rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition-colors hover:bg-neutral-200">
                    <span className="relative z-10">MAGNETIC</span>
                    <div className="absolute inset-0 -z-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 transition-opacity duration-300 hover:opacity-20" />
                </button>
            </motion.div>
        </div>
    );
};
