'use client';

import { useState, useEffect } from 'react';
import { Timer, TrendingDown, AlertCircle } from 'lucide-react';

export default function UrgencyWidgetMockup() {
    const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 59, seconds: 59 });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-red-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-500/20 p-2">
                        <Timer className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Urgency Widget</h3>
                        <p className="text-sm text-slate-400">Incentivo de compra</p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-red-900/40 to-slate-900 border border-red-500/20 p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
                    <div>
                        <h4 className="font-medium text-white">¡Precio Congelado!</h4>
                        <p className="text-sm text-slate-300">Aprovechá el descuento antes del aumento.</p>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="flex flex-col items-center rounded bg-slate-800 p-2 min-w-[60px]">
                        <span className="text-2xl font-bold text-white">{timeLeft.hours}</span>
                        <span className="text-[10px] text-slate-400">HORAS</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-600">:</span>
                    <div className="flex flex-col items-center rounded bg-slate-800 p-2 min-w-[60px]">
                        <span className="text-2xl font-bold text-white">{timeLeft.minutes}</span>
                        <span className="text-[10px] text-slate-400">MIN</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-600">:</span>
                    <div className="flex flex-col items-center rounded bg-slate-800 p-2 min-w-[60px]">
                        <span className="text-2xl font-bold text-white">{timeLeft.seconds}</span>
                        <span className="text-[10px] text-slate-400">SEG</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <div>
                    <div className="text-xs text-slate-400 line-through">Precio Regular: $25.000</div>
                    <div className="text-xl font-bold text-white">$18.500</div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">
                    <TrendingDown className="h-3 w-3" />
                    AHORRAS 25%
                </div>
            </div>
        </div>
    );
}
