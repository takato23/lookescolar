"use client";

import { motion } from "framer-motion";
import { useLandingState } from "./LandingState";

const Section = ({ children, align = "center", className = "" }: { children: React.ReactNode; align?: "left" | "right" | "center"; className?: string }) => {
    return (
        <section
            className={`h-screen w-full flex flex-col justify-center px-6 md:px-20 pointer-events-none ${align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center"
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
    const { setOpening } = useLandingState();

    const handleStart = () => {
        setOpening(true);
        // Wait for animation before navigating
        setTimeout(() => {
            onNavigate("/login");
        }, 1500);
    };

    return (
        <div className="w-full font-sans text-white">
            {/* Section 1: HERO (Closed Shutter) */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="text-center z-10"
                >
                    <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 mix-blend-difference">
                        APERTURA
                    </h1>
                    <p className="text-xl md:text-3xl font-light tracking-wide mb-8 text-gray-200">
                        Abre tu negocio al mundo.
                    </p>
                    <button
                        onClick={handleStart}
                        className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-200 transition-all transform hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Empezar Gratis
                    </button>
                </motion.div>
            </Section>

            {/* Section 2: THE PROBLEM (Focus/Constrict) */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-center max-w-2xl mx-auto bg-black/60 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 text-red-500">
                        ¿Tu trabajo se pierde en el caos?
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                        WeTransfer caducados. Clientes confundidos. Pagos manuales.
                        <br />
                        <span className="text-white font-semibold mt-4 block">Tu talento merece más que una carpeta compartida.</span>
                    </p>
                </motion.div>
            </Section>

            {/* Section 3: THE SOLUTION (Wide Open) */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="w-full"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {[
                            { icon: "🛒", title: "Venta Automática", desc: "Tus clientes compran, pagan y descargan sin que muevas un dedo." },
                            { icon: "💳", title: "Mercado Pago", desc: "Cobros locales integrados. El dinero va directo a tu cuenta." },
                            { icon: "🔒", title: "Protección Total", desc: "Marcas de agua automáticas y entrega segura de archivos." }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.2 }}
                                className="p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors"
                            >
                                <div className="text-5xl mb-6">{item.icon}</div>
                                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
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
                        Todo tu flujo.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            Un solo lugar.
                        </span>
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                        Desde que disparas hasta que cobras. Gestiona galerías, tienda, clientes y calendario en una plataforma unificada.
                    </p>
                    <ul className="space-y-6 text-lg text-gray-400">
                        {[
                            { color: "bg-blue-500", text: "Galerías Privadas" },
                            { color: "bg-purple-500", text: "Tienda de Impresiones" },
                            { color: "bg-green-500", text: "Gestión de Clientes" }
                        ].map((item, i) => (
                            <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="flex items-center gap-4"
                            >
                                <span className={`w-3 h-3 ${item.color} rounded-full shadow-[0_0_10px_currentColor]`} />
                                {item.text}
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>
            </Section>

            {/* Section 5: CTA (Closing) */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <h2 className="text-5xl md:text-8xl font-bold mb-10 leading-tight">
                        Tu próxima gran foto<br />es tu negocio.
                    </h2>
                    <button
                        onClick={handleStart}
                        className="bg-blue-600 text-white px-12 py-6 rounded-full text-2xl font-bold hover:bg-blue-700 transition-all shadow-[0_0_30px_rgba(37,99,235,0.5)] hover:scale-105"
                    >
                        Crear Cuenta Apertura
                    </button>
                    <p className="mt-8 text-gray-400 text-lg">Sin tarjeta de crédito. Cancela cuando quieras.</p>
                </motion.div>
            </Section>
        </div>
    );
}
