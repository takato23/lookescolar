"use client";

import React from "react";

export const LiquidDistortion = () => {
    return (
        <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-indigo-900">
            <svg className="hidden">
                <defs>
                    <filter id="liquid">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.01 0.01"
                            numOctaves="1"
                            result="warp"
                        >
                            <animate
                                attributeName="baseFrequency"
                                dur="10s"
                                values="0.01 0.01;0.02 0.05;0.01 0.01"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            xChannelSelector="R"
                            yChannelSelector="G"
                            scale="30"
                            in="SourceGraphic"
                            in2="warp"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                className="relative h-40 w-40 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
                style={{ filter: "url(#liquid)" }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white mix-blend-overlay">
                        LIQUID
                    </span>
                </div>
            </div>
        </div>
    );
};
