"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sections = [
    {
        id: "phase-1",
        title: "CAPTURE",
        subtitle: "PHASE 1",
        description: "The lens is your tool. The world is your canvas. Capture the moment with precision.",
    },
    {
        id: "phase-2",
        title: "EXHIBIT",
        subtitle: "PHASE 2",
        description: "Curate your portfolio in a premium glass gallery. Let your work speak for itself.",
    },
    {
        id: "phase-3",
        title: "PROFIT",
        subtitle: "PHASE 3",
        description: "Monetize your art. Connect with high-end clients and sell your prints globally.",
    },
    {
        id: "phase-4",
        title: "JOIN",
        subtitle: "PHASE 4",
        description: "Become part of the exclusive network of top-tier photographers.",
    },
];

export default function PlanningOverlay() {
    return (
        <div className="relative z-10 w-full pointer-events-none">
            {sections.map((section) => (
                <section
                    key={section.id}
                    className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden pointer-events-auto"
                >
                    <div className="relative z-10 text-center mix-blend-difference text-white">
                        <motion.h3
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-xl md:text-2xl font-light tracking-[0.5em] mb-4 opacity-80"
                        >
                            {section.subtitle}
                        </motion.h3>

                        {/* Liquid Crystal Typography */}
                        <motion.h2
                            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="text-[18vw] md:text-[15vw] leading-[0.8] font-black tracking-tighter select-none"
                        >
                            {section.title}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="mt-8 text-lg md:text-2xl max-w-xl mx-auto font-light tracking-wide"
                        >
                            {section.description}
                        </motion.p>

                        {section.id === "phase-4" && (
                            <Link href="/login">
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                    className="mt-12 px-12 py-5 bg-white text-black font-bold tracking-widest text-sm hover:bg-gray-100 transition-colors uppercase border border-black/10 shadow-xl backdrop-blur-md"
                                >
                                    Start Now
                                </motion.button>
                            </Link>
                        )}
                    </div>
                </section>
            ))}
            <div className="h-[50vh]" />
        </div>
    );
}
