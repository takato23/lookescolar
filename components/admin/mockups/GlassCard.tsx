"use client";

import React from "react";

export const GlassCard = () => {
    return (
        <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500">
            {/* Abstract shapes for background */}
            <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-yellow-300 mix-blend-multiply blur-xl filter opacity-70 animate-blob" />
            <div className="absolute right-10 bottom-10 h-32 w-32 rounded-full bg-cyan-300 mix-blend-multiply blur-xl filter opacity-70 animate-blob animation-delay-2000" />

            <div className="relative mx-auto w-64 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md transition-transform hover:scale-105">
                <div className="mb-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm" />
                <h3 className="mb-2 text-xl font-bold text-white">Glassmorphism</h3>
                <p className="text-sm text-white/70">
                    Premium frosted glass effect with background blur and semi-transparent layers.
                </p>
                <div className="mt-4 flex gap-2">
                    <div className="h-2 w-16 rounded-full bg-white/30" />
                    <div className="h-2 w-8 rounded-full bg-white/30" />
                </div>
            </div>
        </div>
    );
};
