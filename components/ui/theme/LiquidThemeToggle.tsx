'use client';

import * as React from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface LiquidThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiquidThemeToggle({
  className = '',
  size = 'md',
}: LiquidThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const sizeConfig = {
    sm: { width: 48, height: 28, icon: 14, padding: 2 },
    md: { width: 64, height: 36, icon: 18, padding: 3 },
    lg: { width: 80, height: 44, icon: 22, padding: 4 },
  };

  const config = sizeConfig[size];

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative flex items-center rounded-full border border-white/20 shadow-inner backdrop-blur-xl ${className}`}
      style={{
        width: config.width,
        height: config.height,
        background: isDark
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))'
          : 'linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(241, 245, 249, 0.9))',
        boxShadow: isDark
          ? 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(255,255,255,0.05)'
          : 'inset 2px 2px 6px rgba(0,0,0,0.05), inset -2px -2px 6px rgba(255,255,255,0.8)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      {/* Background Track Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <div className="flex flex-1 justify-center opacity-40">
          <Moon size={config.icon - 4} className="text-slate-400" />
        </div>
        <div className="flex flex-1 justify-center opacity-40">
          <Sun size={config.icon - 4} className="text-amber-500" />
        </div>
      </div>

      {/* Moving Handle */}
      <motion.div
        className="absolute rounded-full shadow-lg backdrop-blur-sm"
        initial={false}
        animate={{
          x: isDark ? config.width - config.height + config.padding : config.padding,
          backgroundColor: isDark ? '#3b82f6' : '#fbbf24', // Blue for moon, Amber for sun
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        style={{
          width: config.height - config.padding * 2,
          height: config.height - config.padding * 2,
          left: 0,
        }}
      >
        {/* Handle Icon */}
        <div className="flex h-full w-full items-center justify-center text-white">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Moon size={config.icon} fill="currentColor" className="text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ duration: 0.2 }}
              >
                <Sun size={config.icon} fill="currentColor" className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isDark
              ? '0 0 15px rgba(59, 130, 246, 0.5)'
              : '0 0 15px rgba(251, 191, 36, 0.5)',
          }}
        />
      </motion.div>
    </motion.button>
  );
}

export default LiquidThemeToggle;
