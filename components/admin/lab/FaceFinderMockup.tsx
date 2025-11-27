'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, Search, Sparkles } from 'lucide-react';

export default function FaceFinderMockup() {
    const [isSearching, setIsSearching] = useState(false);
    const [resultsFound, setResultsFound] = useState(false);

    const handleSearch = () => {
        setIsSearching(true);
        setResultsFound(false);
        setTimeout(() => {
            setIsSearching(false);
            setResultsFound(true);
        }, 2000);
    };

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-blue-500/30">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                        <ScanFace className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Face Finder</h3>
                        <p className="text-sm text-slate-400">Encuéntrame con IA</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
                {/* Search Input */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-800/50 p-6 text-center md:w-1/3">
                    <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-slate-700 bg-slate-800">
                        <img
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
                            alt="Selfie"
                            className="h-full w-full object-cover opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                        />
                        {isSearching && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30 backdrop-blur-sm">
                                <ScanFace className="h-8 w-8 animate-pulse text-white" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSearching ? 'Buscando...' : 'Buscar mis fotos'}
                    </button>
                </div>

                {/* Results Grid */}
                <div className="flex-1 rounded-2xl bg-slate-800/30 p-4">
                    <AnimatePresence mode="wait">
                        {!resultsFound && !isSearching && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex h-full flex-col items-center justify-center text-slate-500"
                            >
                                <Search className="mb-2 h-8 w-8 opacity-20" />
                                <p className="text-sm">Sube una selfie para buscar</p>
                            </motion.div>
                        )}

                        {isSearching && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex h-full flex-col items-center justify-center text-blue-400"
                            >
                                <Sparkles className="mb-2 h-8 w-8 animate-spin" />
                                <p className="text-sm">Analizando 1,240 fotos...</p>
                            </motion.div>
                        )}

                        {resultsFound && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-3 gap-2"
                            >
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="aspect-square overflow-hidden rounded-lg bg-slate-700"
                                    >
                                        <img
                                            src={`https://images.unsplash.com/photo-${i % 2 === 0 ? '1519741497674-611481863552' : '1511795409834-ef04bbd61622'
                                                }?auto=format&fit=crop&w=200&q=80`}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </motion.div>
                                ))}
                                <div className="col-span-3 mt-2 text-center text-xs text-green-400">
                                    ¡Encontramos 12 fotos tuyas!
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
