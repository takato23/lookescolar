import { TrendingUp } from 'lucide-react';
import { HighlightMetricProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

export function HighlightMetric({
    id,
    label,
    value,
    helper,
    icon: Icon,
    index = 0,
}: HighlightMetricProps & { index?: number }) {
    // Paleta de marca más controlada (azules/violetas)
    const colorSchemes = [
        {
            gradient: 'from-indigo-600 to-violet-500',
            bg: 'from-indigo-500/10 via-violet-500/5 to-transparent',
            iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600',
            progressBg: 'from-indigo-500 to-violet-500',
            badgeBg:
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
            glow: 'shadow-indigo-500/20',
        },
        {
            gradient: 'from-blue-600 to-indigo-500',
            bg: 'from-blue-500/10 via-indigo-500/5 to-transparent',
            iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
            progressBg: 'from-blue-500 to-indigo-500',
            badgeBg:
                'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
            glow: 'shadow-blue-500/20',
        },
        {
            gradient: 'from-sky-500 to-blue-600',
            bg: 'from-sky-500/10 via-blue-500/5 to-transparent',
            iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
            progressBg: 'from-sky-500 to-blue-600',
            badgeBg:
                'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
            glow: 'shadow-sky-500/20',
        },
    ];
    const colors = colorSchemes[index % colorSchemes.length];

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300',
                `border-slate-200/80 bg-white shadow-lg ${colors.glow} hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900`
            )}
        >
            {/* Gradient background */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${colors.bg} transition-opacity duration-300`}
            />

            {/* Decorative glow */}
            <div
                className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${colors.gradient} opacity-20 blur-3xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-125`}
            />

            <div className="relative">
                <div className="flex items-start justify-between gap-4">
                    {/* Icon with solid gradient background */}
                    <div className="relative">
                        <div
                            className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110',
                        `${colors.iconBg} ${colors.glow}`
                    )}
                >
                    <Icon
                        className={cn(
                            'h-6 w-6 drop-shadow-sm',
                            'text-white'
                        )}
                        strokeWidth={2}
                            />
                        </div>
                    </div>

                    {/* Helper badge with better styling */}
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm',
                            colors.badgeBg
                        )}
                    >
                        <TrendingUp className="h-3 w-3" />
                        {helper}
                    </span>
                </div>

                {/* Metric label */}
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {label}
                </p>

                {/* Metric value with gradient */}
                <p className="mt-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent dark:from-white dark:via-slate-100 dark:to-slate-300">
                    {value}
                </p>

                {/* Progress indicator with animated fill */}
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/50">
                    <div
                        className={cn(
                            'h-full rounded-full shadow-sm transition-all duration-1000 ease-out',
                            `bg-gradient-to-r ${colors.progressBg}`
                        )}
                        style={{ width: `${Math.min(100, (index + 1) * 33)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
