import { Box, Typography, Container } from '@mui/material';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type CoverVariant = 'vintage' | 'classic' | 'modern' | 'split';

interface GalleryCoverProps {
    variant?: CoverVariant;
    title: string;
    subtitle?: string;
    date?: string;
    backgroundImage: string;
    className?: string;
}

export function GalleryCover({
    variant = 'classic',
    title,
    subtitle,
    date,
    backgroundImage,
    className
}: GalleryCoverProps) {

    // Common animation variants
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: "easeOut" }
    };

    if (variant === 'vintage') {
        return (
            <Box className={cn("relative w-full overflow-hidden bg-white", className)}>
                {/* Main Image Area */}
                <div className="relative h-[70vh] w-full">
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[2s] hover:scale-105"
                        style={{ backgroundImage: `url(${backgroundImage})` }}
                    />
                    <div className="absolute inset-0 bg-black/10" /> {/* Subtle Overlay */}
                </div>

                {/* Vintage Content Area */}
                <Container maxWidth="md" className="py-20 text-center">
                    <motion.div
                        initial={fadeIn.initial}
                        animate={fadeIn.animate}
                        transition={fadeIn.transition}
                    >
                        <Typography
                            variant="h1"
                            className="text-4xl md:text-6xl font-serif text-gray-900 mb-6 tracking-wide uppercase"
                            style={{ fontFamily: '"Playfair Display", serif' }} // Example serif
                        >
                            {title}
                        </Typography>

                        <div className="w-16 h-0.5 bg-gray-400 mx-auto my-8" />

                        <div className="space-y-2">
                            {subtitle && (
                                <Typography className="text-sm md:text-base text-gray-600 font-medium tracking-[0.2em] uppercase">
                                    {subtitle}
                                </Typography>
                            )}
                            {date && (
                                <Typography className="text-sm text-gray-500 font-light tracking-[0.1em]">
                                    {date}
                                </Typography>
                            )}
                        </div>

                        <div className="mt-12">
                            <span className="inline-block animate-bounce text-gray-400">
                                ↓
                            </span>
                        </div>
                    </motion.div>
                </Container>
            </Box>
        );
    }

    // Classic Default
    return (
        <Box className={cn("relative h-screen w-full overflow-hidden flex items-center justify-center text-white", className)}>
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            >
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Content */}
            <Container maxWidth="lg" className="relative z-10 text-center">
                <motion.div
                    initial={fadeIn.initial}
                    animate={fadeIn.animate}
                    transition={fadeIn.transition}
                >
                    <Typography
                        variant="h1"
                        className="text-5xl md:text-7xl font-bold mb-6 tracking-tight drop-shadow-lg"
                    >
                        {title}
                    </Typography>

                    {(subtitle || date) && (
                        <div className="flex flex-col items-center gap-2 mt-4">
                            {subtitle && (
                                <Typography className="text-lg md:text-xl font-light tracking-widest uppercase opacity-90">
                                    {subtitle}
                                </Typography>
                            )}
                            {date && (
                                <Typography className="text-sm font-medium opacity-80 mt-2">
                                    {date}
                                </Typography>
                            )}
                        </div>
                    )}

                    <div className="mt-16">
                        <button className="border border-white/60 hover:bg-white hover:text-black px-8 py-3 transition-all duration-300 text-sm uppercase tracking-widest rounded-sm backdrop-blur-sm">
                            Entrar a la Galería
                        </button>
                    </div>
                </motion.div>
            </Container>
        </Box>
    );
}
