"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export const ParallaxSection = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const y1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, 50]);
    const rotate = useTransform(scrollYProgress, [0, 1], [0, 180]);

    return (
        <div
            ref={ref}
            className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-800"
        >
            <div className="absolute inset-0 grid grid-cols-3 gap-4 p-4 opacity-20">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="rounded-lg bg-white/10" />
                ))}
            </div>

            <motion.div
                style={{ y: y1 }}
                className="absolute left-1/4 top-1/4 h-16 w-16 rounded-full bg-emerald-500 blur-sm"
            />

            <motion.div
                style={{ y: y2, rotate }}
                className="absolute right-1/4 bottom-1/4 h-20 w-20 rounded-lg bg-orange-500 blur-sm"
            />

            <div className="relative z-10 text-center">
                <h3 className="text-2xl font-bold text-white">Parallax</h3>
                <p className="text-white/60">Scroll to see movement</p>
            </div>
        </div>
    );
};
