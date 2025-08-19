'use client';

// EJEMPLO PRÁCTICO: Cómo integrar iconos PNG generados con IA

import { CustomIcon, Logo } from './IconComponents';

// 1. ANTES: Usando emojis (actual)
function SidebarAntes() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">📊</span>  {/* Emoji */}
      <span>Dashboard</span>
    </div>
  );
}

// 2. DESPUÉS: Usando iconos PNG generados con IA
function SidebarDespues() {
  return (
    <div className="flex items-center gap-3">
      <CustomIcon 
        name="dashboard" 
        size={20} 
        className="brightness-0 invert" // Para que sea blanco sobre fondo colorido
      />
      <span>Dashboard</span>
    </div>
  );
}

// 3. EJEMPLO COMPLETO: Sidebar híbrido (emojis + PNG cuando estén listos)
function SidebarHibrido() {
  const items = [
    { 
      label: 'Dashboard', 
      emoji: '📊', 
      icon: 'dashboard',  // PNG cuando esté listo
      color: 'from-blue-500 to-blue-600' 
    },
    { 
      label: 'Eventos', 
      emoji: '📅', 
      icon: 'events',
      color: 'from-purple-500 to-pink-500' 
    }
  ];

  return (
    <nav className="space-y-2">
      {items.map((item) => (
        <a key={item.label} href={`#${item.label.toLowerCase()}`} 
           className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50">
          
          <div className={`size-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
            
            {/* Intenta cargar PNG, fallback a emoji */}
            <CustomIcon 
              name={item.icon} 
              size={20} 
              className="brightness-0 invert"
              alt={item.label}
            />
            
            {/* Emoji como fallback (se oculta si PNG carga bien) */}
            <span className="text-lg fallback-emoji">{item.emoji}</span>
          </div>
          
          <span className="font-semibold">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// 4. LOGO PRINCIPAL con PNG generado por IA
function TopBarConLogo() {
  return (
    <header className="flex items-center gap-4">
      
      {/* Logo PNG generado por IA */}
      <Logo 
        variant="main" 
        size={40}
        className="drop-shadow-lg" 
      />
      
      <div>
        <h1 className="font-bold text-lg">LookEscolar</h1>
        <p className="text-xs text-gray-600">Panel de Administración</p>
      </div>
    </header>
  );
}

// 5. ELEMENTOS DECORATIVOS con PNG
function ElementosDecorativos() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      
      {/* Estrellas PNG en lugar de emojis */}
      <img 
        src="/images/decorative/star-1.png" 
        alt=""
        className="absolute top-20 right-20 w-12 h-12 opacity-30 animate-bounce"
      />
      
      <img 
        src="/images/decorative/sparkle-1.png" 
        alt=""
        className="absolute bottom-32 left-32 w-8 h-8 opacity-40 animate-pulse"
      />
      
      {/* Fallback a emojis si las imágenes no cargan */}
      <div className="absolute top-40 left-10 text-4xl text-blue-300/40 animate-pulse">💫</div>
    </div>
  );
}

export { 
  SidebarAntes, 
  SidebarDespues, 
  SidebarHibrido, 
  TopBarConLogo, 
  ElementosDecorativos 
};
