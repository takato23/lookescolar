'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookHeart, PenTool, User } from 'lucide-react';

const MESSAGES = [
    { id: 1, user: 'Tía Marta', text: '¡Que sean muy felices! Hermosa fiesta.', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80' },
    { id: 2, user: 'Lucas y Sofi', text: 'Los queremos mucho amigos ❤️', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80' },
    { id: 3, user: 'Abuelo Pepe', text: 'Disfruten cada momento.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80' },
];

export default function DigitalGuestbookMockup() {
    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-amber-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-500/20 p-2">
                        <BookHeart className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Guestbook</h3>
                        <p className="text-sm text-slate-400">Mensajes y deseos</p>
                    </div>
                </div>
                <button className="rounded-full bg-amber-500/10 p-2 text-amber-400 hover:bg-amber-500/20">
                    <PenTool className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-3">
                {MESSAGES.map((msg, index) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3 rounded-xl bg-slate-800/50 p-3"
                    >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
                            <img src={msg.avatar} alt={msg.user} className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{msg.user}</div>
                            <div className="text-sm text-slate-300">{msg.text}</div>
                        </div>
                    </motion.div>
                ))}

                <div className="relative mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-3 text-center text-sm text-slate-500">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100 bg-slate-800/80 backdrop-blur-sm rounded-xl">
                        <span className="font-medium text-amber-400">Ver todos los mensajes</span>
                    </div>
                    + 128 mensajes más
                </div>
            </div>
        </div>
    );
}
