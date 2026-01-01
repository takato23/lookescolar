'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CanvasGlowBackgroundProps {
  className?: string;
}

export default function CanvasGlowBackground({ className }: CanvasGlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationId = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const blobs = [
      { x: 0.2, y: 0.3, r: 180, speed: 0.0006, hue: 210 },
      { x: 0.7, y: 0.2, r: 220, speed: 0.0004, hue: 280 },
      { x: 0.6, y: 0.75, r: 200, speed: 0.0005, hue: 160 },
    ];

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(248, 250, 252, 0.9)');
      gradient.addColorStop(0.5, 'rgba(241, 245, 249, 0.9)');
      gradient.addColorStop(1, 'rgba(226, 232, 240, 0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      blobs.forEach((blob, index) => {
        const offset = time * blob.speed + index;
        const cx = width * (blob.x + Math.sin(offset) * 0.08);
        const cy = height * (blob.y + Math.cos(offset) * 0.08);
        const radius = blob.r * (1 + Math.sin(offset * 1.2) * 0.08);

        const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        radial.addColorStop(0, `hsla(${blob.hue}, 70%, 70%, 0.28)`);
        radial.addColorStop(0.6, `hsla(${blob.hue}, 70%, 60%, 0.12)`);
        radial.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const loop = (time: number) => {
      draw(time);
      animationId = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      draw(0);
    } else {
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden="true"
    />
  );
}

