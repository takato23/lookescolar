'use client';

import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Package, GripVertical, Image as ImageIcon, Plus } from 'lucide-react';

const MOCK_PHOTOS = [
    { id: 'p1', url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=200&q=80' },
    { id: 'p2', url: 'https://images.unsplash.com/photo-1517677208171-0bc6799a4c67?auto=format&fit=crop&w=200&q=80' },
    { id: 'p3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80' },
];

export default function VisualPackageMockup() {
    const [slots, setSlots] = useState([
        { id: 's1', label: 'Retrato Principal', photo: null as string | null },
        { id: 's2', label: 'Foto Grupal', photo: null as string | null },
        { id: 's3', label: 'Foto Divertida', photo: null as string | null },
    ]);

    const handleDrop = (slotId: string, photoUrl: string) => {
        setSlots(slots.map(s => s.id === slotId ? { ...s, photo: photoUrl } : s));
    };

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-emerald-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/20 p-2">
                        <Package className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Visual Package Builder</h3>
                        <p className="text-sm text-slate-400">Armado de paquetes intuitivo</p>
                    </div>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    Pack Premium
                </div>
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
                {/* Photo Source List */}
                <div className="flex-1 rounded-xl bg-slate-800/50 p-4">
                    <h4 className="mb-3 text-sm font-medium text-slate-300">Tus Fotos</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {MOCK_PHOTOS.map((photo) => (
                            <motion.div
                                key={photo.id}
                                drag
                                dragSnapToOrigin
                                whileDrag={{ scale: 1.1, zIndex: 10 }}
                                className="relative aspect-square cursor-grab overflow-hidden rounded-lg bg-slate-700"
                            >
                                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500 text-center">Arrastra las fotos a los espacios</p>
                </div>

                {/* Package Slots */}
                <div className="flex-[2] space-y-3">
                    {slots.map((slot) => (
                        <div
                            key={slot.id}
                            className="relative flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/30 p-3 transition-colors hover:border-emerald-500/50 hover:bg-slate-800/50"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                // In a real app, we'd use dnd-kit or similar. 
                                // For mockup, we'll just simulate filling the slot with the first photo on click for simplicity if drag fails
                                handleDrop(slot.id, MOCK_PHOTOS[0].url);
                            }}
                            onClick={() => !slot.photo && handleDrop(slot.id, MOCK_PHOTOS[0].url)}
                        >
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
                                {slot.photo ? (
                                    <img src={slot.photo} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Plus className="h-6 w-6 text-slate-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-white">{slot.label}</div>
                                <div className="text-xs text-slate-400">
                                    {slot.photo ? 'Foto seleccionada' : 'Arrastra una foto aquí'}
                                </div>
                            </div>
                            {slot.photo && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSlots(slots.map(s => s.id === slot.id ? { ...s, photo: null } : s));
                                    }}
                                    className="rounded-full p-1 hover:bg-white/10"
                                >
                                    <div className="h-4 w-4 text-slate-400">×</div>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
