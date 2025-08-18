'use client';
import Image from 'next/image';

// Componente para iconos personalizados PNG
export function CustomIcon({ 
  name, 
  size = 24, 
  className = "", 
  alt = "" 
}: {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={`/images/icons/${name}.png`}
      alt={alt || name}
      width={size}
      height={size}
      className={`transition-all duration-200 ${className}`}
      // Fallback si no encuentra la imagen
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}

// Componente para logos
export function Logo({ 
  variant = 'main', 
  size = 32,
  className = ""
}: {
  variant?: 'main' | 'mini';
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/images/logos/lookescolar-${variant}.png`}
      alt="LookEscolar"
      width={size}
      height={size}
      className={`${className}`}
      priority // Para el logo principal
    />
  );
}

// Hook para gestionar iconos
export function useCustomIcons() {
  const sidebarIcons = [
    { name: 'dashboard', label: 'Dashboard' },
    { name: 'events', label: 'Eventos' },
    { name: 'folders', label: 'Carpetas' },
    { name: 'orders', label: 'Pedidos' },
    { name: 'publish', label: 'Publicar' },
    { name: 'settings', label: 'Ajustes' }
  ];

  return { sidebarIcons };
}

// Ejemplo de integración en sidebar
export function EnhancedSidebar() {
  const { sidebarIcons } = useCustomIcons();
  
  return (
    <aside className="p-4">
      {sidebarIcons.map((item) => (
        <a key={item.name} href={`#${item.name}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50">
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-2">
            <CustomIcon 
              name={item.name} 
              size={20} 
              className="brightness-0 invert" // Para iconos blancos
              alt={item.label}
            />
          </div>
          <span className="font-medium">{item.label}</span>
        </a>
      ))}
    </aside>
  );
}
