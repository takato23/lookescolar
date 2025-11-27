"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLandingState } from "./LandingState";

// ============================================================================
// LAYER 6: PREMIUM HTML OVERLAY TRANSITIONS
// ============================================================================

const Section = ({
    children,
    align = "center",
    className = ""
}: {
    children: React.ReactNode;
    align?: "left" | "right" | "center";
    className?: string
}) => {
    return (
        <section
            className={`h-screen w-full flex flex-col justify-center px-6 md:px-20 pointer-events-none ${
                align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center"
            } ${className}`}
        >
            <div className="pointer-events-auto max-w-4xl w-full">{children}</div>
        </section>
    );
};

interface AperturaContentProps {
    onNavigate: (path: string) => void;
}

export function AperturaContent({ onNavigate }: AperturaContentProps) {
    const { isOpening, setOpening } = useLandingState();

    const handleStart = () => {
        console.log('handleStart clicked - triggering tunnel effect');
        setOpening(true);

        // Navigation timing synced with tunnel animation
        // Phase 1: 0-1s (aperture opens)
        // Phase 2: 1-2s (camera moves through)
        // Phase 3: 2-2.5s (light explosion)
        // Navigate at peak brightness
        setTimeout(() => {
            onNavigate("/login");
        }, 2800);
    };

    return (
        <>
            {/* ================================================================ */}
            {/* CINEMATIC TRANSITION OVERLAYS */}
            {/* ================================================================ */}
            <AnimatePresence>
                {isOpening && (
                    <>
                        {/* Layer 1: Outer Vignette Intensification */}
                        <motion.div
                            className="fixed inset-0 z-[90] pointer-events-none"
                            style={{
                                background: "radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,1) 100%)"
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.5, 1, 0.3] }}
                            transition={{
                                duration: 2.5,
                                times: [0, 0.3, 0.6, 1],
                                ease: "easeInOut"
                            }}
                        />

                        {/* Layer 2: Cyan Glow Ring */}
                        <motion.div
                            className="fixed inset-0 z-[92] pointer-events-none flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 3] }}
                            transition={{
                                duration: 2.2,
                                times: [0, 0.4, 1],
                                ease: "easeOut"
                            }}
                        >
                            <div
                                className="w-[50vw] h-[50vw] rounded-full"
                                style={{
                                    background: "radial-gradient(circle, transparent 40%, rgba(0,200,255,0.4) 50%, transparent 60%)",
                                    filter: "blur(20px)"
                                }}
                            />
                        </motion.div>

                        {/* Layer 3: Speed Lines (CSS) */}
                        <motion.div
                            className="fixed inset-0 z-[93] pointer-events-none overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0.6, 0] }}
                            transition={{
                                duration: 2.5,
                                times: [0, 0.3, 0.6, 1],
                                ease: "easeIn"
                            }}
                        >
                            {/* Radial speed lines */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: `
                                        repeating-conic-gradient(
                                            from 0deg at 50% 50%,
                                            transparent 0deg,
                                            rgba(100,200,255,0.1) 0.5deg,
                                            transparent 1deg
                                        )
                                    `,
                                    animation: "spin 0.5s linear infinite"
                                }}
                            />
                        </motion.div>

                        {/* Layer 4: Central Light Burst */}
                        <motion.div
                            className="fixed inset-0 z-[95] pointer-events-none"
                            style={{
                                background: "radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(150,220,255,0.8) 20%, rgba(50,150,255,0.4) 40%, transparent 60%)"
                            }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: [0, 0, 0.2, 0.8, 1],
                                scale: [0.8, 0.9, 1, 1.2, 1.5]
                            }}
                            transition={{
                                duration: 2.8,
                                times: [0, 0.4, 0.6, 0.85, 1],
                                ease: [0.22, 1, 0.36, 1]
                            }}
                        />

                        {/* Layer 5: Final Flash */}
                        <motion.div
                            className="fixed inset-0 z-[100] pointer-events-none bg-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0, 1] }}
                            transition={{
                                duration: 2.8,
                                times: [0, 0.7, 0.9, 1],
                                ease: "easeIn"
                            }}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* ================================================================ */}
            {/* MAIN CONTENT WITH FADE OUT */}
            {/* ================================================================ */}
            <motion.div
                className="w-full font-sans text-white"
                animate={{
                    opacity: isOpening ? 0 : 1,
                    scale: isOpening ? 0.85 : 1,
                    filter: isOpening ? "blur(30px)" : "blur(0px)",
                    y: isOpening ? -50 : 0
                }}
                transition={{
                    duration: 1.2,
                    delay: isOpening ? 0.2 : 0,
                    ease: [0.22, 1, 0.36, 1]
                }}
            >
                {/* Top Right Login Button */}
                <motion.div
                    className="fixed top-6 right-6 z-50"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.8 }}
                >
                    <button
                        onClick={handleStart}
                        className="relative group text-white font-bold text-lg tracking-wide uppercase overflow-hidden"
                    >
                        <span className="relative z-10 mix-blend-difference">Iniciar Sesion</span>
                        <motion.span
                            className="absolute bottom-0 left-0 w-full h-[2px] bg-white origin-left"
                            initial={{ scaleX: 0 }}
                            whileHover={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                        />
                    </button>
                </motion.div>

                {/* Section 1: HERO */}
                <Section align="center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="text-center z-10"
                    >
                        <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 mix-blend-difference">
                            TU NEGOCIO
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                                AUTOMATIZADO
                            </span>
                        </h1>
                        <p className="text-xl md:text-3xl font-light tracking-wide mb-8 text-gray-200">
                            La plataforma todo-en-uno para fotografos escolares y de eventos.
                        </p>
                        <motion.button
                            onClick={handleStart}
                            whileHover={{
                                scale: 1.05,
                                boxShadow: "0 0 40px rgba(100,200,255,0.5)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="relative bg-white text-black px-10 py-5 rounded-full text-lg font-bold overflow-hidden group"
                        >
                            <span className="relative z-10">Empezar Gratis</span>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400"
                                initial={{ x: "-100%" }}
                                whileHover={{ x: "0%" }}
                                transition={{ duration: 0.3 }}
                            />
                        </motion.button>

                        {/* Scroll Indicator */}
                        <motion.div
                            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 0.5, y: 0 }}
                            transition={{ delay: 2, duration: 1 }}
                        >
                            <span className="text-xs tracking-[0.3em] uppercase text-gray-400">Scroll</span>
                            <motion.div
                                className="w-[1px] h-16 bg-gradient-to-b from-white via-white to-transparent"
                                animate={{
                                    scaleY: [1, 0.5, 1],
                                    opacity: [0.3, 0.8, 0.3]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </motion.div>
                    </motion.div>
                </Section>

                {/* Section 2: THE PROBLEM */}
                <Section align="center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-center max-w-2xl mx-auto bg-black/60 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6 text-red-400">
                            Deja de perseguir pagos y enviar archivos manualmente.
                        </h2>
                        <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                            Olvidate de los WeTransfer caducados, las planillas de excel y los cobros en efectivo.
                            <br />
                            <span className="text-white font-semibold mt-4 block">
                                Automatiza la venta, el cobro y la entrega de tus fotos.
                            </span>
                        </p>
                    </motion.div>
                </Section>

                {/* Section 3: THE SOLUTION */}
                <Section align="center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="w-full"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            {[
                                { icon: "🛒", title: "Venta Automatica", desc: "Tus clientes compran, pagan y descargan sin que muevas un dedo.", color: "from-green-400 to-emerald-500" },
                                { icon: "💳", title: "Mercado Pago", desc: "Cobros locales integrados. El dinero va directo a tu cuenta.", color: "from-blue-400 to-cyan-500" },
                                { icon: "🔒", title: "Proteccion Total", desc: "Marcas de agua automaticas y entrega segura de archivos.", color: "from-purple-400 to-pink-500" }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.15 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300"
                                >
                                    <div className="text-5xl mb-6">{item.icon}</div>
                                    <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </Section>

                {/* Section 4: ECOSYSTEM */}
                <Section align="left">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-xl"
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                            Galerias, Tienda y<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500">
                                Gestion de Clientes.
                            </span>
                        </h2>
                        <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                            Centraliza todo tu flujo de trabajo. Sube tus fotos, configura tus precios y deja que el sistema venda por ti.
                        </p>
                        <ul className="space-y-6 text-lg text-gray-400">
                            {[
                                { color: "bg-blue-500", text: "Galerias Privadas", glow: "shadow-blue-500/50" },
                                { color: "bg-purple-500", text: "Tienda de Impresiones", glow: "shadow-purple-500/50" },
                                { color: "bg-green-500", text: "Gestion de Clientes", glow: "shadow-green-500/50" }
                            ].map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="flex items-center gap-4"
                                >
                                    <span className={`w-3 h-3 ${item.color} rounded-full shadow-lg ${item.glow}`} />
                                    <span className="text-white/90">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </Section>

                {/* Section 5: CTA */}
                <Section align="center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        <h2 className="text-5xl md:text-8xl font-bold mb-10 leading-tight">
                            Tu proxima gran foto<br />
                            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                es tu negocio.
                            </span>
                        </h2>
                        <motion.button
                            onClick={handleStart}
                            whileHover={{
                                scale: 1.05,
                                boxShadow: "0 0 60px rgba(59,130,246,0.6)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-14 py-7 rounded-full text-2xl font-bold hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/30"
                        >
                            Crear Cuenta Ahora
                        </motion.button>
                        <p className="mt-8 text-gray-400 text-lg">Sin tarjeta de credito. Cancela cuando quieras.</p>
                    </motion.div>
                </Section>
            </motion.div>

            {/* CSS Animation for Speed Lines */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
