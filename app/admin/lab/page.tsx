'use client';

import { motion } from 'framer-motion';
import { Sparkles, FlaskConical } from 'lucide-react';
import ProofingDashboardMockup from '@/components/admin/lab/ProofingDashboardMockup';
import TimelineViewMockup from '@/components/admin/lab/TimelineViewMockup';
import GuestUploadMockup from '@/components/admin/lab/GuestUploadMockup';
import DigitalGuestbookMockup from '@/components/admin/lab/DigitalGuestbookMockup';
import FaceFinderMockup from '@/components/admin/lab/FaceFinderMockup';

export default function LookLabPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-purple-500/10 p-3">
                            <FlaskConical className="h-8 w-8 text-purple-400" />
                        </div>
                        <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-4xl font-bold text-transparent">
                            LookLab: Social Events
                        </h1>
                    </div>
                    <p className="mt-2 text-slate-400">
                        Funcionalidades diseñadas para Casamientos, 15s y Eventos Corporativos.
                    </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        v0.3.0 Social
                    </span>
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
                {/* Feature 1: Client Proofing (Retained) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 lg:col-span-2 xl:col-span-3"
                >
                    <ProofingDashboardMockup />
                </motion.div>

                {/* Feature 2: Event Timeline View */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-1 lg:col-span-2"
                >
                    <TimelineViewMockup />
                </motion.div>

                {/* Feature 3: Guest Live Upload */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="col-span-1"
                >
                    <GuestUploadMockup />
                </motion.div>

                {/* Feature 4: Digital Guestbook */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="col-span-1"
                >
                    <DigitalGuestbookMockup />
                </motion.div>

                {/* Feature 5: AI Face Finder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="col-span-1 lg:col-span-2"
                >
                    <FaceFinderMockup />
                </motion.div>
            </div>
        </div>
    );
}
