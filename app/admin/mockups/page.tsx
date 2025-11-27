"use client";

import React from "react";
import { TiltCard } from "@/components/admin/mockups/TiltCard";
import { ParticleField } from "@/components/admin/mockups/ParticleField";
import { CinematicText } from "@/components/admin/mockups/CinematicText";
import { GlassCard } from "@/components/admin/mockups/GlassCard";
import { MagneticButton } from "@/components/admin/mockups/MagneticButton";
import { GlowingBorder } from "@/components/admin/mockups/GlowingBorder";
import { ParallaxSection } from "@/components/admin/mockups/ParallaxSection";
import { ObjectViewer3D } from "@/components/admin/mockups/ObjectViewer3D";
import { LiquidDistortion } from "@/components/admin/mockups/LiquidDistortion";
import { SpotlightCard } from "@/components/admin/mockups/SpotlightCard";

export default function MockupsPage() {
    return (
        <div className="min-h-screen bg-black p-8 text-white">
            <div className="mx-auto max-w-7xl">
                <header className="mb-12 text-center">
                    <h1 className="mb-4 text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                        Technology Showcase
                    </h1>
                    <p className="text-xl text-neutral-400">
                        Experimental UI/UX concepts and interactive components.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <TiltCard />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <ParticleField />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <CinematicText />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <GlassCard />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <MagneticButton />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <GlowingBorder />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-lime-600 to-green-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <ParallaxSection />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <ObjectViewer3D />
                        </div>
                    </div>

                    <div className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <LiquidDistortion />
                        </div>
                    </div>

                    <div className="group relative md:col-span-2 lg:col-span-3">
                        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                        <div className="relative rounded-xl bg-black">
                            <SpotlightCard />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
