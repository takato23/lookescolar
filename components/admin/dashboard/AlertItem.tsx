import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AlertItemProps } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const toneConfig: Record<
    AlertItemProps['tone'],
    {
        bg: string;
        border: string;
        text: string;
        iconBg: string;
        badgeBg: string;
        accentText: string;
        accentBorder: string;
    }
> = {
    info: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-200/80 dark:border-blue-500/30',
        text: 'text-blue-900 dark:text-blue-100',
        iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
        accentText: 'text-blue-600 dark:text-blue-300',
        accentBorder: 'border-l-blue-400/70 dark:border-l-blue-500/60',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200/80 dark:border-amber-500/30',
        text: 'text-amber-900 dark:text-amber-100',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
        badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
        accentText: 'text-amber-700 dark:text-amber-300',
        accentBorder: 'border-l-amber-400/70 dark:border-l-amber-500/60',
    },
    danger: {
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-200/80 dark:border-red-500/30',
        text: 'text-red-900 dark:text-red-100',
        iconBg: 'bg-gradient-to-br from-red-500 to-rose-500',
        badgeBg: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
        accentText: 'text-red-600 dark:text-red-300',
        accentBorder: 'border-l-red-400/70 dark:border-l-red-500/60',
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200/80 dark:border-emerald-500/30',
        text: 'text-emerald-900 dark:text-emerald-100',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
        accentText: 'text-emerald-600 dark:text-emerald-300',
        accentBorder: 'border-l-emerald-400/70 dark:border-l-emerald-500/60',
    },
};

export function AlertItem({
    id,
    title,
    description,
    badge,
    tone,
    icon: Icon,
    index = 0,
    actions,
}: AlertItemProps) {
    const config = toneConfig[tone];

    return (
        <div
            className={cn(
                'group relative flex items-start gap-4 overflow-hidden rounded-xl border p-4 transition-all duration-300 border-l-4 hover:shadow-md',
                `${config.bg} ${config.border} ${config.accentBorder}`
            )}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Icon with solid gradient */}
            <div className="flex-shrink-0">
                <div
                    className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110',
                        config.iconBg
                    )}
                >
                    <Icon
                        className={cn('h-5 w-5 text-white')}
                        strokeWidth={2}
                    />
                </div>
            </div>

            {/* Content */}
                <div className={cn('flex-1 min-w-0', config.text)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">{title}</p>
                    {badge && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                                config.badgeBg
                            )}
                        >
                            {badge}
                            <ChevronRight className="h-3 w-3" />
                        </span>
                    )}
                </div>
                <p
                    className={cn(
                        'mt-0.5 text-sm opacity-80'
                    )}
                >
                    {description}
                </p>
                {actions && actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {actions.map((action, actionIndex) => {
                            const variant =
                                action.variant === 'secondary' ? 'secondary' : 'default';
                            const actionClasses = cn(
                            'h-8 px-3 text-xs'
                            );

                            if (action.href) {
                                return (
                                    <Button
                                        key={`${id}-action-${actionIndex}`}
                                        size="sm"
                                        variant={variant}
                                        className={actionClasses}
                                        asChild
                                    >
                                        <Link href={action.href}>{action.label}</Link>
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    key={`${id}-action-${actionIndex}`}
                                    size="sm"
                                    variant={variant}
                                    className={actionClasses}
                                    onClick={action.onClick}
                                    type="button"
                                >
                                    {action.label}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
