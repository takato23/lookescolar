'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Check, Grid } from 'lucide-react';

const PHOTOS = [
    { id: 1, url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=200&q=80', liked: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1517677208171-0bc6799a4c67?auto=format&fit=crop&w=200&q=80', liked: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80', liked: true },
    { id: 4, url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=200&q=80', liked: false },
    { id: 5, url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=200&q=80', liked: false },
];

export default function ProofingDashboardMockup() {
    const [photos, setPhotos] = useState(PHOTOS);

    const toggleLike = (id: number) => {
        setPhotos(photos.map(p => p.id === id ? { ...p, liked: !p.liked } : p));
    };

    const likedCount = photos.filter(p => p.liked).length;

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-purple-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                        <Grid className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Client Proofing</h3>
                        <p className="text-sm text-slate-400">Selección de fotos para álbum</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-300">
                        Seleccionadas: <span className="font-bold text-white">{likedCount}</span>/10
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                        <Check className="h-4 w-4" />
                        Confirmar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo) => (
                    <div key={photo.id} className="group/photo relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-800">
                        <img src={photo.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/photo:scale-110" />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover/photo:opacity-100">
                            <div className="absolute top-2 right-2 flex flex-col gap-2">
                                <button
                                    onClick={() => toggleLike(photo.id)}
                                    className={`rounded-full p-2 backdrop-blur-md transition-colors ${photo.liked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    <Heart className={`h-4 w-4 ${photo.liked ? 'fill-current' : ''}`} />
                                </button>
                                <button className="rounded-full bg-white/20 p-2 text-white backdrop-blur-md hover:bg-white/30">
                                    <MessageSquare className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Selection Indicator */}
                        {photo.liked && (
                            <div className="absolute bottom-2 left-2 rounded-full bg-purple-500 p-1">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
