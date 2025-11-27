import { Badge } from '@/components/ui/badge';
import { HighlightMetricProps } from '@/types/dashboard';

export function HighlightMetric({
    id,
    label,
    value,
    helper,
    icon: Icon,
    index = 0,
}: HighlightMetricProps) {
    const colors = [
        {
            bg: 'from-[#d4af37]/20 to-[#f2d06b]/20',
            icon: 'text-[#d4af37]',
            ring: 'ring-[#d4af37]/50',
        },
        {
            bg: 'from-[#44aaff]/20 to-[#00ffff]/20',
            icon: 'text-[#44aaff]',
            ring: 'ring-[#44aaff]/50',
        },
        {
            bg: 'from-[#cd7f32]/20 to-[#e69b5c]/20',
            icon: 'text-[#cd7f32]',
            ring: 'ring-[#cd7f32]/50',
        },
    ];
    const color = colors[index % colors.length];

    return (
        <div
            className="liquid-glass-intense group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        >
            {/* Animated background gradient */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${color.bg} opacity-50 transition-opacity duration-300 group-hover:opacity-70`}
            ></div>

            <div className="relative">
                <div className="flex items-start justify-between">
                    {/* Icon with animated glow */}
                    <div className="relative">
                        <div
                            className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color.bg} blur-lg transition-all duration-300 group-hover:blur-xl`}
                        ></div>
                        <div
                            className={`liquid-glass relative flex h-12 w-12 items-center justify-center rounded-xl ring-2 ${color.ring} transition-all duration-300 group-hover:scale-110`}
                        >
                            <Icon className={`h-6 w-6 ${color.icon}`} />
                        </div>
                    </div>

                    {/* Helper badge */}
                    <Badge
                        variant="outline"
                        className="liquid-glass border-0 text-xs font-medium shadow-sm"
                    >
                        {helper}
                    </Badge>
                </div>

                {/* Metric label */}
                <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>

                {/* Metric value with gradient */}
                <p className="mt-2 bg-gradient-to-br from-white to-slate-300 bg-clip-text text-4xl font-bold tabular-nums text-transparent">
                    {value}
                </p>

                {/* Progress indicator line */}
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-700/50">
                    <div
                        className={`h-full bg-gradient-to-r ${color.bg.replace(
                            '/20',
                            ''
                        )} transition-all duration-1000`}
                        style={{ width: `${Math.min(100, (index + 1) * 33)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
