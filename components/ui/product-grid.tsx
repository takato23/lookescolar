'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BrutalistText, BrutalistLabel } from './brutalist-typography';

interface ProductCardProps {
  image: string;
  title: string;
  subtitle: string;
  backgroundColor: 'beige' | 'white' | 'black' | 'navy';
  imageAlt: string;
  className?: string;
}

export function ProductCard({
  image,
  title,
  subtitle,
  backgroundColor,
  imageAlt,
  className,
}: ProductCardProps) {
  const backgroundClasses = {
    beige: 'bg-[#D4C4B0]',
    white: 'bg-white border border-gray-200',
    black: 'bg-black',
    navy: 'bg-[#2C3E50]',
  };

  const textClasses = {
    beige: 'text-black',
    white: 'text-black',
    black: 'text-white',
    navy: 'text-white',
  };

  return (
    <div
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden',
        backgroundClasses[backgroundColor],
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Ver más sobre ${title} - ${subtitle}`}
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        priority={false}
      />

      <div className="absolute bottom-4 left-4 right-4">
        <BrutalistText
          className={cn('mb-1 font-bold', textClasses[backgroundColor])}
        >
          {title}
        </BrutalistText>
        <BrutalistLabel
          className={cn(textClasses[backgroundColor], 'opacity-80')}
        >
          {subtitle}
        </BrutalistLabel>
      </div>
    </div>
  );
}

interface ProductGridProps {
  className?: string;
}

export function ProductGrid({ className }: ProductGridProps) {
  const products = [
    {
      image:
        'https://images.unsplash.com/photo-1547043884-975a4f9ea025?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwzfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMGVxdWlwbWVudHxlbnwwfDJ8fHwxNzU2MDc3ODQ4fDA&ixlib=rb-4.1.0&q=85',
      title: 'Equipos',
      subtitle: "Profesional 25'",
      backgroundColor: 'beige' as const,
      imageAlt:
        'Professional camera equipment - Photo by Michael Soledad on Unsplash',
    },
    {
      image:
        'https://images.unsplash.com/photo-1576159714344-884e59bd45bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwyfHxwaG90b3MlMjBzY2hvb2wlMjBzdHVkZW50c3xlbnwwfDJ8fGJsYWNrX2FuZF93aGl0ZXwxNzU2MDc3ODQ4fDA&ixlib=rb-4.1.0&q=85',
      title: 'Fotos',
      subtitle: "Escolar 25'",
      backgroundColor: 'white' as const,
      imageAlt:
        'School photos collection - Photo by Giuseppe Argenziano on Unsplash',
    },
    {
      image:
        'https://images.unsplash.com/photo-1523800503107-5bc3ba2a6f81?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwxfHxxciUyMGNvZGUlMjB0ZWNobm9sb2d5JTIwZGlnaXRhbHxlbnwwfDJ8fGJsYWNrfDE3NTYwNzc4NDh8MA&ixlib=rb-4.1.0&q=85',
      title: 'QR Codes',
      subtitle: "Digital 25'",
      backgroundColor: 'black' as const,
      imageAlt: 'QR code technology - Photo by Oskar Yildiz on Unsplash',
    },
    {
      image:
        'https://images.unsplash.com/photo-1510166218561-8b0b8df7c887?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHw0fHxmYW1pbHklMjBtb2JpbGUlMjBwaG9uZXxlbnwwfDJ8fGJsdWV8MTc1NjA3Nzg0OHww&ixlib=rb-4.1.0&q=85',
      title: 'Acceso',
      subtitle: "Familiar 25'",
      backgroundColor: 'navy' as const,
      imageAlt: 'Family mobile access - Photo by Kenny Eliason on Unsplash',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-0 lg:grid-cols-4', className)}>
      {products.map((product, index) => (
        <ProductCard key={index} {...product} />
      ))}
    </div>
  );
}
