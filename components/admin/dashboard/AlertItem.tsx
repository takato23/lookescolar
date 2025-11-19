import { Badge } from '@/components/ui/badge';
import { AlertItemProps } from '@/types/dashboard';

const toneStyles: Record<AlertItemProps['tone'], string> = {
    info: 'border-blue-200/60 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    warning:
        'border-amber-200/60 bg-amber-50/70 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    danger:
        'border-red-200/60 bg-red-50/70 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    success:
        'border-emerald-200/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
};

export function AlertItem({
    id,
    title,
    description,
    badge,
    tone,
    icon: Icon,
    index = 0,
}: AlertItemProps) {
    const toneColors = {
        info: 'from-blue-500 to-cyan-500',
        warning: 'from-amber-500 to-orange-500',
        danger: 'from-red-500 to-pink-500',
        success: 'from-emerald-500 to-teal-500',
    };
    const gradientColor = toneColors[tone];

    return (
        <div
            className={`liquid-glass group relative flex items-start gap-4 overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-x-1 hover:shadow-lg ${toneStyles[tone]}`}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Animated side indicator */}
            <div
                className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${gradientColor}`}
            ></div>

            {/* Icon with glow */}
            <div className="relative flex-shrink-0">
                <div
                    className={`absolute inset-0 rounded-lg bg-gradient-to-br ${gradientColor} opacity-30 blur-md`}
                ></div>
                <div
                    className={`liquid-glass relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradientColor} p-0.5`}
                >
                    <div className="flex h-full w-full items-center justify-center rounded-[0.4rem] bg-white/90 dark:bg-slate-900/90">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-bold">{title}</p>
                <p className="mt-0.5 text-sm opacity-90">{description}</p>
            </div>

            <Badge
                variant="outline"
                className="flex-shrink-0 border-current/30 bg-white/30 text-xs font-semibold dark:bg-black/20"
            >
                {badge}
            </Badge>
        </div>
    );
}
