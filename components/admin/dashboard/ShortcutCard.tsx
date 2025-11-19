import Link from 'next/link';
import { ShortcutCardProps } from '@/types/dashboard';

export function ShortcutCard({
    id,
    href,
    title,
    description,
    icon: Icon,
    index = 0,
}: ShortcutCardProps & { index?: number }) {
    const gradients = [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-orange-500 to-red-500',
        'from-emerald-500 to-teal-500',
    ];
    const gradient = gradients[index % gradients.length];

    return (
        <Link
            href={href}
            className="liquid-glass group relative overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
            {/* Animated gradient background */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
            ></div>

            {/* Icon with glow effect */}
            <div className="relative mb-4">
                <div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-20 blur-xl transition-all duration-300 group-hover:opacity-40 group-hover:blur-2xl`}
                ></div>
                <div
                    className={`liquid-glass relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} p-0.5`}
                >
                    <div className="flex h-full w-full items-center justify-center rounded-[0.6rem] bg-white/90 dark:bg-slate-900/90">
                        <Icon
                            className={`h-6 w-6 bg-gradient-to-br ${gradient} bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-110`}
                        />
                    </div>
                </div>
            </div>

            <div className="relative">
                <h3 className="text-lg font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {description}
                </p>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-6 right-6 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                <svg
                    className="h-5 w-5 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </div>
        </Link>
    );
}
