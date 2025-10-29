import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  ...props
}: SectionHeaderProps) {
  const alignment = align === 'center' ? 'items-center text-center' : '';

  return (
    <div
      className={clsx('flex flex-col gap-3', alignment, className)}
      {...props}
    >
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1f2a44]">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-semibold text-[#1f2a44] sm:text-[34px]">
        {title}
      </h2>
      {description && (
        <p className="max-w-2xl text-base text-[#475467] sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
