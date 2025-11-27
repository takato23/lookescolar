"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sections = [
    {
        id: "phase-1",
        title: "CAPTURE",
        subtitle: "FASE 1",
        description: "Tu lente es tu herramienta. El mundo es tu lienzo. Captura el momento con precisión.",
    },
    {
        id: "phase-2",
        title: "EXHIBIT",
        subtitle: "FASE 2",
        description: "Cura tu portafolio en una galería de cristal premium. Deja que tu trabajo hable por sí mismo.",
    },
    {
        id: "phase-3",
        title: "PROFIT",
        subtitle: "FASE 3",
        description: "Monetiza tu arte. Conecta con clientes de alto nivel y vende tus fotos globalmente.",
    },
    {
        id: "phase-4",
        title: "JOIN",
        subtitle: "FASE 4",
        description: "Únete a la red exclusiva de fotógrafos profesionales.",
    },
];

export default function PlanningOverlay() {
    return (
        <div className="relative z-10 w-full pointer-events-none">
            {sections.map((section) => (
                <section
                    key={section.id}
                    className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden pointer-events-auto"
                >
                    <div className="relative z-10 text-center mix-blend-difference text-white">
                        <motion.h3
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-xl md:text-2xl font-light tracking-[0.5em] mb-4 opacity-80"
                        >
                            {section.subtitle}
                        </motion.h3>

                        {/* Liquid Crystal Typography */}
                        <motion.h2
                            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="text-[18vw] md:text-[15vw] leading-[0.8] font-black tracking-tighter select-none"
                        >
                            {section.title}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="mt-8 text-lg md:text-2xl max-w-xl mx-auto font-light tracking-wide px-4"
                        >
                            {section.description}
                        </motion.p>

                        {section.id === "phase-4" && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                                className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center"
                            >
                                {/* Register Button - Primary CTA */}
                                <Link href="/register">
                                    <motion.button
                                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -12px rgba(6, 182, 212, 0.4)" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-10 py-4 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold tracking-widest text-sm uppercase rounded-xl shadow-xl transition-all duration-300"
                                    >
                                        Crear Cuenta
                                    </motion.button>
                                </Link>

                                {/* Login Button - Secondary */}
                                <Link href="/login">
                                    <motion.button
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.95)" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-10 py-4 bg-white/90 text-black font-bold tracking-widest text-sm uppercase rounded-xl border border-white/20 shadow-xl backdrop-blur-md transition-all duration-300"
                                    >
                                        Iniciar Sesión
                                    </motion.button>
                                </Link>
                            </motion.div>
                        )}
                    </div>
                </section>
            ))}
            <div className="h-[50vh]" />
        </div>
    );
}
