'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CalendarDays, ChevronRight } from 'lucide-react';

const MOMENTS = [
    { id: 1, time: '16:00', title: 'Getting Ready', count: 145, color: 'bg-blue-500' },
    { id: 2, time: '18:30', title: 'Ceremonia', count: 320, color: 'bg-purple-500' },
    { id: 3, time: '20:00', title: 'Recepción', count: 210, color: 'bg-pink-500' },
    { id: 4, time: '22:00', title: 'Fiesta', count: 850, color: 'bg-orange-500' },
];

export default function TimelineViewMockup() {
    const [activeMoment, setActiveMoment] = useState(MOMENTS[1]);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                        <CalendarDays className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Event Timeline</h3>
                        <p className="text-sm text-slate-400">Narrativa cronológica</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
                {/* Timeline Navigation */}
                <div className="relative flex flex-row gap-4 overflow-x-auto pb-4 md:w-1/3 md:flex-col md:overflow-visible md:pb-0">
                    {/* Vertical Line (Desktop) */}
                    <div className="absolute left-3.5 top-2 bottom-2 hidden w-0.5 bg-slate-800 md:block"></div>

                    {MOMENTS.map((moment) => (
                        <button
                            key={moment.id}
                            onClick={() => setActiveMoment(moment)}
                            className="group/item relative z-10 flex min-w-[120px] flex-col gap-1 rounded-xl p-2 text-left transition-all hover:bg-white/5 md:flex-row md:items-center md:gap-4"
                        >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${activeMoment.id === moment.id
                                    ? `border-${moment.color.split('-')[1]}-400 ${moment.color} text-white`
                                    : 'border-slate-700 bg-slate-900 text-slate-500 group-hover/item:border-slate-500'
                                }`}>
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <div className={`text-sm font-medium transition-colors ${activeMoment.id === moment.id ? 'text-white' : 'text-slate-400 group-hover/item:text-slate-300'
                                    }`}>
                                    {moment.title}
                                </div>
                                <div className="text-xs text-slate-500">{moment.time} · {moment.count} fotos</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Content Preview */}
                <div className="flex-1 rounded-2xl bg-slate-800/50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium text-white">{activeMoment.title}</h4>
                        <button className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                            Ver todas <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-slate-700">
                                <img
                                    src={`https://images.unsplash.com/photo-${activeMoment.id === 1 ? '1515934751635-c81c6bc9a2d8' :
                                            activeMoment.id === 2 ? '1519741497674-611481863552' :
                                                activeMoment.id === 3 ? '1511795409834-ef04bbd61622' :
                                                    '1492684223066-81342ee5ff30'
                                        }?auto=format&fit=crop&w=300&q=80`}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform hover:scale-110"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
