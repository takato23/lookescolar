'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Map, Users } from 'lucide-react';

const HEATMAP_DATA = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: Math.random() * 100,
    conversion: Math.random() * 5 + 1,
}));

export default function PricingHeatmapMockup() {
    const [hoveredHour, setHoveredHour] = useState<number | null>(null);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-green-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/20 p-2">
                        <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Dynamic Pricing</h3>
                        <p className="text-sm text-slate-400">Demand-based adjustments</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div> Low
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div> High
                    </div>
                </div>
            </div>

            <div className="flex h-40 items-end gap-1">
                {HEATMAP_DATA.map((data) => (
                    <div
                        key={data.hour}
                        className="relative flex-1 group/bar"
                        onMouseEnter={() => setHoveredHour(data.hour)}
                        onMouseLeave={() => setHoveredHour(null)}
                    >
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${data.value}%` }}
                            transition={{ delay: data.hour * 0.02, duration: 0.5 }}
                            className={`w-full rounded-t-sm transition-colors ${data.value > 80 ? 'bg-red-500' :
                                    data.value > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                                } ${hoveredHour === data.hour ? 'brightness-125' : 'opacity-80'}`}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-2 flex justify-between text-xs text-slate-500 font-mono">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <DollarSign className="h-3 w-3" /> Suggested Price
                    </div>
                    <div className="mt-1 text-xl font-bold text-white">$24.99</div>
                    <div className="text-xs text-green-400">+15% vs Base</div>
                </div>
                <div className="rounded-xl bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Users className="h-3 w-3" /> Active Users
                    </div>
                    <div className="mt-1 text-xl font-bold text-white">842</div>
                    <div className="text-xs text-blue-400">High Traffic</div>
                </div>
            </div>
        </div>
    );
}
