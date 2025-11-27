"use client";

import React from "react";

export const GlowingBorder = () => {
    return (
        <div className="flex h-64 w-full items-center justify-center rounded-xl bg-black p-10">
            <div className="relative h-full w-full max-w-xs rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-[2px]">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-75 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200 animate-tilt"></div>
                <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl bg-neutral-900 p-4 text-center">
                    <h3 className="text-xl font-bold text-white">Neon Glow</h3>
                    <p className="mt-2 text-sm text-neutral-400">
                        Animated gradient border with blur effect for a neon look.
                    </p>
                </div>
            </div>
        </div>
    );
};
