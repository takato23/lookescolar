'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, CheckCircle2, XCircle, AlertTriangle, BrainCircuit, ImageIcon } from 'lucide-react';

const MOCK_PHOTOS = [
    { id: 1, score: 98, status: 'accepted', reason: 'Sharp focus, good composition' },
    { id: 2, score: 45, status: 'rejected', reason: 'Blurry subject' },
    { id: 3, score: 89, status: 'accepted', reason: 'Great expression' },
    { id: 4, score: 60, status: 'warning', reason: 'Eyes closed?' },
];

export default function AiCullingMockup() {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % MOCK_PHOTOS.length);
            setIsScanning(true);
            setTimeout(() => setIsScanning(false), 1500);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const currentPhoto = MOCK_PHOTOS[currentPhotoIndex];

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-blue-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                        <BrainCircuit className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">AI Smart Culling</h3>
                        <p className="text-sm text-slate-400">Automated quality control</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    Processing
                </div>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-800">
                {/* Simulated Photo Content */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                    <ImageIcon className="h-16 w-16 opacity-20" />
                    <span className="absolute text-xs font-mono opacity-20">IMG_{1000 + currentPhoto.id}.RAW</span>
                </div>

                {/* Scanning Overlay */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            initial={{ top: '0%' }}
                            animate={{ top: '100%' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                            className="absolute left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        />
                    )}
                </AnimatePresence>

                {/* Analysis Result Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                    <motion.div
                        key={currentPhoto.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-3">
                            {currentPhoto.status === 'accepted' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                            {currentPhoto.status === 'rejected' && <XCircle className="h-5 w-5 text-red-400" />}
                            {currentPhoto.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                            <div>
                                <div className="text-sm font-medium text-white">
                                    Score: <span className={
                                        currentPhoto.score > 80 ? 'text-green-400' :
                                            currentPhoto.score > 50 ? 'text-yellow-400' : 'text-red-400'
                                    }>{currentPhoto.score}/100</span>
                                </div>
                                <div className="text-xs text-slate-300">{currentPhoto.reason}</div>
                            </div>
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                            {isScanning ? 'ANALYZING...' : 'COMPLETE'}
                        </div>
                    </motion.div>
                </div>

                {/* Face Detection Boxes (Simulated) */}
                {!isScanning && currentPhoto.status !== 'rejected' && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    >
                        <div className="absolute -top-6 left-0 bg-green-500/80 px-1 py-0.5 text-[10px] text-black font-bold">
                            FACE 99%
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-800/50 p-2 text-center">
                    <div className="text-xs text-slate-400">Processed</div>
                    <div className="text-lg font-bold text-white">1,240</div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-2 text-center">
                    <div className="text-xs text-slate-400">Kept</div>
                    <div className="text-lg font-bold text-green-400">85%</div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-2 text-center">
                    <div className="text-xs text-slate-400">Time Saved</div>
                    <div className="text-lg font-bold text-blue-400">4.5h</div>
                </div>
            </div>
        </div>
    );
}
