import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ShortcutCardProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

export function ShortcutCard({
    id,
    href,
    title,
    description,
    icon: Icon,
    index = 0,
}: ShortcutCardProps & { index?: number }) {
    // Paleta de marca más controlada (azules/violetas)
    const colorSchemes = [
        {
            gradient: 'from-indigo-600 via-violet-500 to-blue-600',
            bg: 'from-indigo-500/15 to-blue-500/10',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
            iconColor: 'text-white',
            glow: 'shadow-indigo-500/25',
            hoverGlow: 'group-hover:shadow-indigo-500/40',
        },
        {
            gradient: 'from-blue-600 via-indigo-500 to-sky-500',
            bg: 'from-blue-500/15 to-sky-500/10',
            iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-500',
            iconColor: 'text-white',
            glow: 'shadow-blue-500/25',
            hoverGlow: 'group-hover:shadow-blue-500/40',
        },
        {
            gradient: 'from-violet-600 via-indigo-500 to-blue-500',
            bg: 'from-violet-500/15 to-blue-500/10',
            iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-600',
            iconColor: 'text-white',
            glow: 'shadow-violet-500/25',
            hoverGlow: 'group-hover:shadow-violet-500/40',
        },
        {
            gradient: 'from-sky-500 via-blue-500 to-indigo-600',
            bg: 'from-sky-500/15 to-indigo-500/10',
            iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
            iconColor: 'text-white',
            glow: 'shadow-sky-500/25',
            hoverGlow: 'group-hover:shadow-sky-500/40',
        },
    ];
    const colors = colorSchemes[index % colorSchemes.length];

    return (
        <Link
            href={href}
            className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                `border-slate-200/80 bg-white shadow-lg ${colors.glow} hover:-translate-y-1.5 hover:shadow-xl ${colors.hoverGlow} dark:border-slate-700/50 dark:bg-slate-900`
            )}
        >
            {/* Gradient background on hover */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />

            {/* Decorative corner accent */}
            <div
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${colors.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-25 group-hover:scale-150`}
            />

            {/* Icon container */}
            <div className="relative mb-5">
                <div
                    className={cn(
                        'relative flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110',
                        `${colors.iconBg} ${colors.glow} group-hover:shadow-xl ${colors.hoverGlow}`
                    )}
                >
                    <Icon
                        className={cn('h-6 w-6 drop-shadow-sm', colors.iconColor)}
                        strokeWidth={2}
                    />
                </div>
            </div>

            <div className="relative">
                <h3 className="text-lg font-bold text-slate-900 transition-colors duration-300 dark:text-white">
                    {title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {description}
                </p>
            </div>

            {/* Arrow indicator with animation */}
            <div
                className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 bg-slate-100 dark:bg-slate-800"
            >
                <ArrowRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
        </Link>
    );
}
