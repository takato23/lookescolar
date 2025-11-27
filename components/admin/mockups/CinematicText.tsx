"use client";

import React from "react";
import { motion } from "framer-motion";

export const CinematicText = () => {
    const text = "CINEMATIC REVEAL";
    const words = text.split(" ");

    return (
        <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl bg-black p-8">
            <div className="overflow-hidden">
                <motion.div
                    initial={{ y: "100%" }}
                    whileInView={{ y: 0 }}
                    transition={{ duration: 0.8, ease: [0.6, 0.01, -0.05, 0.95] }}
                    className="text-4xl font-black text-white md:text-5xl"
                >
                    {words[0]}
                </motion.div>
            </div>
            <div className="overflow-hidden">
                <motion.div
                    initial={{ y: "100%" }}
                    whileInView={{ y: 0 }}
                    transition={{
                        duration: 0.8,
                        delay: 0.1,
                        ease: [0.6, 0.01, -0.05, 0.95]
                    }}
                    className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-4xl font-black text-transparent md:text-5xl"
                >
                    {words[1]}
                </motion.div>
            </div>
        </div>
    );
};
