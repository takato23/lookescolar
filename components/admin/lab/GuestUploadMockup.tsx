'use client';

import { useState } from 'react';
import { Camera, QrCode, UploadCloud, ArrowUp } from 'lucide-react';

export default function GuestUploadMockup() {
    const [isUploading, setIsUploading] = useState(false);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-pink-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-pink-500/20 p-2">
                        <Camera className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Guest Cam</h3>
                        <p className="text-sm text-slate-400">POV de invitados</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="relative aspect-[9/18] w-48 overflow-hidden rounded-3xl border-4 border-slate-800 bg-black shadow-2xl">
                    {/* Mobile UI Mockup */}
                    <div className="absolute inset-0 flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 text-center">
                            <div className="text-xs font-bold text-white">Boda Ana & Juan</div>
                        </div>

                        {/* Camera Viewfinder (Simulated) */}
                        <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1511285560982-1351cdeb9821?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center opacity-80">
                            <div className="flex h-full items-center justify-center">
                                <div className="h-16 w-16 rounded-full border-2 border-white/30"></div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-black p-4">
                            <div className="flex items-center justify-between">
                                <div className="h-8 w-8 rounded bg-slate-800"></div>
                                <button
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 shadow-lg shadow-pink-600/30"
                                    onClick={() => {
                                        setIsUploading(true);
                                        setTimeout(() => setIsUploading(false), 2000);
                                    }}
                                >
                                    {isUploading ? (
                                        <ArrowUp className="h-6 w-6 animate-bounce text-white" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full bg-white"></div>
                                    )}
                                </button>
                                <div className="h-8 w-8 rounded bg-slate-800"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-800/50 p-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1">
                        <QrCode className="h-full w-full text-black" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-400">Escanear para subir</div>
                        <div className="text-sm font-bold text-white">look.at/ana-juan</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400">Subidas hoy</div>
                    <div className="text-lg font-bold text-pink-400">342</div>
                </div>
            </div>
        </div>
    );
}
