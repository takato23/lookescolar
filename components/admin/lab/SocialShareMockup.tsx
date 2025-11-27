'use client';

import { useState } from 'react';
import { Share2, Download, Instagram } from 'lucide-react';

export default function SocialShareMockup() {
    const [isGenerating, setIsGenerating] = useState(false);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-pink-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-pink-500/20 p-2">
                        <Share2 className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Social Share</h3>
                        <p className="text-sm text-slate-400">Viralización automática</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <div className="relative aspect-[9/16] w-48 overflow-hidden rounded-2xl border-4 border-slate-800 bg-slate-900 shadow-2xl">
                    {/* Story Content */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517677208171-0bc6799a4c67?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>

                        {/* Branding Overlay */}
                        <div className="absolute bottom-8 left-0 right-0 text-center">
                            <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                            <div className="font-serif text-lg font-bold text-white">LookEscolar</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/80">Memories 2025</div>
                        </div>
                    </div>

                    {/* Instagram UI Mockup */}
                    <div className="absolute top-2 left-2 right-2 flex gap-1">
                        <div className="h-0.5 flex-1 rounded-full bg-white/50"></div>
                        <div className="h-0.5 flex-1 rounded-full bg-white/30"></div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-700">
                    <Instagram className="h-4 w-4" />
                    Story
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700">
                    <Download className="h-4 w-4" />
                    Bajar
                </button>
            </div>
        </div>
    );
}
