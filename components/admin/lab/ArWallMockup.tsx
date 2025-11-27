'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Move, Maximize, Image as ImageIcon } from 'lucide-react';

export default function ArWallMockup() {
    const [framePosition, setFramePosition] = useState({ x: 50, y: 40 });
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-pink-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-pink-500/20 p-2">
                        <Smartphone className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">AR Wall Preview</h3>
                        <p className="text-sm text-slate-400">Visualize in your home</p>
                    </div>
                </div>
            </div>

            <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-slate-800">
                {/* Living Room Background (Simulated) */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2158&auto=format&fit=crop')] bg-cover bg-center opacity-50 grayscale transition-all group-hover:grayscale-0"></div>

                {/* AR Overlay Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>

                {/* Draggable Frame */}
                <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 300, top: 0, bottom: 150 }}
                    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                    className="absolute cursor-grab rounded-lg border-4 border-white bg-slate-900 shadow-2xl"
                    style={{
                        left: `${framePosition.x}%`,
                        top: `${framePosition.y}%`,
                        width: '120px',
                        height: '160px',
                        x: '-50%',
                        y: '-50%'
                    }}
                >
                    <div className="flex h-full w-full items-center justify-center bg-slate-800">
                        <ImageIcon className="h-8 w-8 text-slate-600" />
                    </div>

                    {/* Dimensions Label */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                        30 x 40 cm
                    </div>
                </motion.div>

                {/* UI Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button className="rounded-full bg-white/10 p-2 backdrop-blur-md hover:bg-white/20">
                        <Move className="h-4 w-4 text-white" />
                    </button>
                    <button className="rounded-full bg-white/10 p-2 backdrop-blur-md hover:bg-white/20">
                        <Maximize className="h-4 w-4 text-white" />
                    </button>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-900 bg-slate-700"></div>
                    ))}
                </div>
                <button className="rounded-lg bg-pink-500/20 px-4 py-2 text-sm font-medium text-pink-400 hover:bg-pink-500/30">
                    Upload Room Photo
                </button>
            </div>
        </div>
    );
}
