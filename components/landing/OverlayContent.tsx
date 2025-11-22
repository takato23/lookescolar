"use client";

import { motion } from "framer-motion";

const Section = ({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) => {
    return (
        <section
            className={`h-screen w-full flex flex-col justify-center px-10 md:px-20 pointer-events-none ${align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center"
                }`}
        >
            <div className="pointer-events-auto max-w-lg">{children}</div>
        </section>
    );
};

export function OverlayContent() {
    return (
        <div className="w-full">
            {/* Section 1: Hero */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="text-center"
                >
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white mb-4 drop-shadow-lg">
                        Look Escolar
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 font-light tracking-wide mb-12">
                        Tu Mirada. Tu Negocio. El Mundo.
                    </p>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
                    >
                        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
                            <div className="w-1 h-2 bg-white rounded-full" />
                        </div>
                    </motion.div>
                </motion.div>
            </Section>

            {/* Section 2: Features (Lens moves left, text on right) */}
            <Section align="right">
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-right"
                >
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        Exhibe tu Arte
                    </h2>
                    <p className="text-lg text-gray-300 mb-4">
                        Una plataforma diseñada para fotógrafos exigentes.
                        Sube, organiza y vende tus fotos con la elegancia que merecen.
                    </p>
                    <ul className="text-gray-400 space-y-2">
                        <li>• Galerías inmersivas</li>
                        <li>• Venta de archivos digitales y físicos</li>
                        <li>• Protección de derechos de autor</li>
                    </ul>
                </motion.div>
            </Section>

            {/* Section 3: Global (Lens moves right, text on left) */}
            <Section align="left">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        Alcance Global
                    </h2>
                    <p className="text-lg text-gray-300 mb-4">
                        Conecta con clientes de todo el mundo.
                        Nuestra infraestructura se encarga de la logística,
                        tú solo preocúpate por capturar el momento.
                    </p>
                </motion.div>
            </Section>

            {/* Section 4: CTA (Lens centers) */}
            <Section align="center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-8">
                        Empieza Ahora
                    </h2>
                    <button className="bg-white text-black px-8 py-4 rounded-full text-xl font-bold hover:bg-gray-200 transition-colors duration-300">
                        Crear mi Portfolio
                    </button>
                </motion.div>
            </Section>
        </div>
    );
}
