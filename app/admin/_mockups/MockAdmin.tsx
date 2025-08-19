'use client';
import * as React from 'react';
import { CommandPalette } from './CommandPalette';
import { useCommandPalette } from './useCommandPalette';
import { Logo } from './LogoComponent';
import { ThemeToggle } from './ThemeToggle';
import { DashboardIcon, EventsIcon, FoldersIcon } from './LiquidIcons';

// Estilos para animaciones, efectos avanzados y dark mode
const customStyles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 3s linear infinite;
  }
  
  /* Smooth scroll behavior */
  html {
    scroll-behavior: smooth;
  }
  
  /* Theme transition para switching suave */
  * {
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  }
  
  /* Command Palette animations */
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes zoom-in-95 {
    from { 
      opacity: 0;
      transform: scale(0.95);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .animate-in {
    animation-duration: 0.2s;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
  
  .zoom-in-95 {
    animation-name: zoom-in-95;
  }
  
  /* LIGHT MODE - Liquid Glass Effect */
  .liquid-glass {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    background-color: rgba(255, 255, 255, 0.72);
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  }
  
  .elevated-panel {
    box-shadow: 
      0 1px 3px 0 rgba(0, 0, 0, 0.1),
      0 1px 2px 0 rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  
  .elevated-panel-lg {
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .elevated-panel-xl {
    box-shadow: 
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  
  /* DARK MODE - Liquid Glass Effect */
  .dark .liquid-glass {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    background-color: rgba(15, 23, 42, 0.80);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dark .elevated-panel {
    box-shadow: 
      0 1px 3px 0 rgba(0, 0, 0, 0.3),
      0 1px 2px 0 rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  .dark .elevated-panel-lg {
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.4),
      0 2px 4px -1px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  
  .dark .elevated-panel-xl {
    box-shadow: 
      0 10px 15px -3px rgba(0, 0, 0, 0.5),
      0 4px 6px -2px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
`;

type Stat = { label: string; value: string; hint?: string };
type Action = { label: string; sub?: string; color: string; icon: JSX.Element };
type SidebarItem = { label: string; badge: string; icon: string | JSX.Element; color: string };
type EventItem = { estado: 'Activo' | 'Próximo'; titulo: string; fecha: string; colegio: string; created: string };
type PhotoItem = { name: string; date: string; size: string; status: 'Aprobada' | 'Pendiente' };

const stats: Stat[] = [
  { label: 'Pedidos hoy', value: '8', hint: 'Nuevos pedidos' },
  { label: 'Pagos confirmados', value: '$0', hint: 'Ingresado hoy' },
  { label: 'Pendientes', value: '8', hint: 'Por revisar' },
  { label: 'Fotos hoy', value: '1', hint: 'Subidas hoy' }
];

const actions: Action[] = [
  { label: 'Crear Evento', sub: 'Nueva sesión', color: 'from-blue-500 to-indigo-500', icon: IconCalendar() },
  { label: 'Subir Fotos', sub: 'Con watermark', color: 'from-violet-500 to-fuchsia-500', icon: IconCamera() },
  { label: 'Asignar Fotos', sub: 'Con QR codes', color: 'from-amber-500 to-orange-500', icon: IconUsers() },
  { label: 'Ver Pedidos', sub: 'Gestionar ventas', color: 'from-emerald-600 to-green-500', icon: IconBox() }
];

const eventos: EventItem[] = [
  { estado: 'Activo', titulo: 'Colegio Normal', fecha: '24 de feb 2027 • miércoles', colegio: 'Colegio Normal', created: 'Creado 16/8/2025' },
  { estado: 'Activo', titulo: 'General', fecha: '15 de ago 2025 • viernes', colegio: 'General', created: 'Creado 16/8/2025' },
  { estado: 'Activo', titulo: 'Test Event API', fecha: '14 de ene 2024 • domingo', colegio: 'General', created: 'Creado 15/8/2025' }
];

const fotos: PhotoItem[] = [
  { name: 'IMG_0953-byn.jpg', date: '18/08/2025', size: '575.82 KB', status: 'Aprobada' },
  { name: 'IMG_1101-2.jpg', date: '16/08/2025', size: '387.24 KB', status: 'Aprobada' },
  { name: 'IMG_1120-2.jpg', date: '16/08/2025', size: '533.61 KB', status: 'Aprobada' },
  { name: 'IMG_1121-2.jpg', date: '16/08/2025', size: '512.2 KB', status: 'Aprobada' },
  { name: 'IMG_1094-2.jpg', date: '15/08/2025', size: '499.49 KB', status: 'Aprobada' },
  { name: 'IMG_1068-2.jpg', date: '13/08/2025', size: '504.52 KB', status: 'Aprobada' },
  { name: 'IMG_1101-2.jpg', date: '16/08/2025', size: '387.24 KB', status: 'Aprobada' },
  { name: 'IMG_1120-2.jpg', date: '16/08/2025', size: '533.61 KB', status: 'Aprobada' }
];

export default function MockAdmin() {
  const [isDark, setIsDark] = React.useState(false);
  const { isOpen: isCommandPaletteOpen, closePalette } = useCommandPalette();

  // Auto-detectar preferencia del sistema al cargar
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('lookescolar-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(systemPrefersDark);
    }
  }, []);

  // Aplicar clase dark al documento
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('lookescolar-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden transition-colors duration-300">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 text-6xl text-yellow-300/30 dark:text-yellow-400/20 animate-bounce hidden lg:block">⭐</div>
          <div className="absolute top-40 left-10 text-4xl text-blue-300/40 dark:text-blue-400/20 animate-pulse hidden lg:block">💫</div>
          <div className="absolute bottom-32 right-32 text-5xl text-green-300/30 dark:text-green-400/20 animate-bounce delay-1000 hidden lg:block">🌟</div>
          <div className="absolute bottom-20 left-20 text-3xl text-purple-300/40 dark:text-purple-400/20 animate-pulse delay-500 hidden lg:block">✨</div>
        </div>
        
        <TopBar isDark={isDark} onToggleTheme={toggleTheme} />
        <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6 pt-6 lg:pt-8 pb-4 lg:pb-6">
            {/* Sidebar - Hidden on mobile, use mobile navigation instead */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>
            <main className="space-y-6 lg:space-y-8 pb-20 lg:pb-0">
              <HeaderGradient />
              <DashboardSection />
              <EventsSection />
              <PhotosSection />
            </main>
          </div>
        </div>
        
        {/* Mobile Navigation Bottom Bar */}
        <MobileBottomNav />
        
        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={closePalette}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>
    </>
  );
}

function TopBar({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="sticky top-0 z-50 liquid-glass">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-10 lg:size-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-700/50 grid place-items-center elevated-panel-lg hover:elevated-panel-xl transition-all duration-300 hover:scale-105 group">
            <Logo variant="blue" size="md" className="group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-lg tracking-tight leading-tight text-neutral-800 dark:text-neutral-100">LookEscolar</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold leading-relaxed">Panel de Administración</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <div className="relative group">
            <input 
              placeholder="Buscar con ⌘K..." 
              className="hidden md:block h-10 w-80 rounded-xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-700/60 px-4 outline-none focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-400/50 focus:border-blue-300/50 dark:focus:border-blue-400/50 elevated-panel backdrop-blur-sm placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-800 dark:text-neutral-200 cursor-pointer" 
              readOnly
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <kbd className="bg-neutral-200 dark:bg-neutral-600 px-1.5 py-0.5 rounded text-xs font-mono">⌘</kbd>
              <kbd className="bg-neutral-200 dark:bg-neutral-600 px-1.5 py-0.5 rounded text-xs font-mono">K</kbd>
            </div>
          </div>
          
          {/* Theme Toggle Button */}
          <ThemeToggle 
            isDark={isDark}
            onToggle={onToggleTheme}
            className="elevated-panel hover:elevated-panel-lg"
          />
          
          <button className="size-10 grid place-items-center rounded-xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-600/80 transition-all duration-200 elevated-panel">
            <span className="text-lg">👤</span>
          </button>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold tracking-tight leading-tight elevated-panel-lg hover:elevated-panel-xl transition-all duration-200 hover:scale-105">
            admin ▼
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const items = [
    { label: 'Dashboard', badge: '↳ resumen', icon: <DashboardIcon size={20} />, color: 'from-blue-500 to-blue-600' },
    { label: 'Eventos', badge: '↳ gestión', icon: <EventsIcon size={20} />, color: 'from-purple-500 to-pink-500' },
    { label: 'Carpetas', badge: '↳ por evento', icon: <FoldersIcon size={20} />, color: 'from-yellow-500 to-orange-500' },
    { label: 'Pedidos', badge: '↳ ventas', icon: '🛒', color: 'from-emerald-500 to-green-600' },
    { label: 'Publicar', badge: '↳ compartir', icon: '👥', color: 'from-cyan-500 to-blue-500' },
    { label: 'Ajustes', badge: '↳ sistema', icon: '⚙️', color: 'from-gray-500 to-slate-600' }
  ];
  return (
    <aside className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/85 dark:bg-slate-800/85 backdrop-blur-sm p-4 elevated-panel-xl">
      <nav className="space-y-2">
        {items.map((it) => (
          <a key={it.label} href={`#${it.label.toLowerCase()}`} className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all duration-200 border border-transparent hover:border-blue-200/50 dark:hover:border-blue-400/30 hover:elevated-panel">
            {typeof it.icon === 'string' ? (
              <div className={`size-10 rounded-xl bg-gradient-to-br ${it.color} text-white flex items-center justify-center elevated-panel group-hover:elevated-panel-lg group-hover:scale-105 transition-all duration-200`}>
                <span className="text-lg">{it.icon}</span>
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-all duration-200">
                <div className="scale-[2]">{it.icon}</div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                {it.label}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed">
                {it.badge}
              </div>
            </div>
          </a>
        ))}
      </nav>
      <div className="mt-6 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30 border border-emerald-200/60 dark:border-emerald-700/60 p-4 text-xs elevated-panel">
        <div className="font-bold tracking-tight leading-tight text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <span className="size-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></span>
          Sistema Activo
        </div>
        <div className="text-emerald-600 dark:text-emerald-400 mt-1 leading-relaxed">v2.0.0 • Seguro • Privado</div>
      </div>
    </aside>
  );
}

function HeaderGradient() {
  return (
    <section className="rounded-2xl border border-blue-200/50 dark:border-blue-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 elevated-panel-xl">
      <div className="rounded-xl bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/40 dark:via-purple-900/40 dark:to-pink-900/40 p-6 relative overflow-hidden elevated-panel">
        <div className="absolute top-2 right-2 text-2xl animate-spin-slow">🌟</div>
        <div className="absolute bottom-2 left-2 text-xl animate-bounce delay-300">✨</div>
        <div className="text-sm text-blue-600 dark:text-blue-300 font-medium">lunes, 18 de agosto de 2025</div>
        <h1 id="dashboard" className="mt-2 text-3xl font-extrabold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 sm:text-4xl lg:text-5xl">
          Panel de Administración
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300 leading-relaxed">Gestiona tu estudio fotográfico escolar de manera eficiente</p>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-blue-200/50 dark:border-blue-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 elevated-panel-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
                          <div className="text-sm text-blue-600 dark:text-blue-300 font-semibold leading-snug flex items-center gap-2">
              <span className="text-lg">📈</span>
              Dashboard Profesional
            </div>
            <h2 className="text-xl font-extrabold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 sm:text-2xl lg:text-3xl">Resumen de hoy</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const colors = [
              'from-yellow-400 to-orange-500',
              'from-green-400 to-emerald-500', 
              'from-orange-400 to-red-500',
              'from-blue-400 to-purple-500'
            ];
            const icons = ['⭐', '💰', '⏳', '📸'];
            return (
              <div key={s.label} className="group rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/95 dark:bg-slate-700/95 p-5 elevated-panel hover:elevated-panel-lg transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold leading-snug">{s.label}</div>
                  <div className={`size-8 rounded-lg bg-gradient-to-br ${colors[i]} flex items-center justify-center text-white elevated-panel group-hover:elevated-panel-lg group-hover:scale-110 transition-all duration-200`}>
                    <span className="text-sm">{icons[i]}</span>
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 mb-1">{s.value}</div>
                {s.hint && <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{s.hint}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {actions.map((a) => (
          <button key={a.label} className={`group rounded-2xl border border-neutral-200/60 bg-gradient-to-br ${a.color} text-white p-5 elevated-panel-lg hover:elevated-panel-xl transition-all duration-200 hover:-translate-y-1 hover:scale-105`}>
            <div className="flex items-center gap-4">
              <div className="size-11 grid place-items-center rounded-xl bg-white/20 elevated-panel group-hover:elevated-panel-lg transition-all duration-200">{a.icon}</div>
              <div className="text-left">
                <div className="font-bold tracking-tight leading-tight">{a.label}</div>
                <div className="text-sm opacity-90 leading-snug">{a.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm elevated-panel-xl">
        <div className="p-6">
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 font-semibold leading-snug">Actividad Reciente</div>
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-slate-700/80 p-3 elevated-panel hover:elevated-panel-lg transition-all duration-200">
                <div className="flex items-center gap-3">
                  <span className="size-8 grid place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-700 elevated-panel text-neutral-600 dark:text-neutral-300">•</span>
                  <div>
                    <div className="text-sm text-neutral-800 dark:text-neutral-200 font-semibold leading-snug">Actualización #{i + 1}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">Hace unos segundos</div>
                  </div>
                </div>
                <span className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">→</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function EventsSection() {
  return (
    <section className="space-y-4" id="eventos">
      <h2 className="text-xl font-bold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 sm:text-2xl">Eventos</h2>
      <div className="space-y-4">
        {eventos.map((e, i) => (
          <article key={i} className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-5 elevated-panel-lg hover:elevated-panel-xl transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 elevated-panel font-medium">{e.estado}</span>
                <span className="px-3 py-1 text-xs rounded-full bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 elevated-panel font-medium">Próximo</span>
              </div>
              <button className="h-9 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-slate-700/80 px-4 text-sm elevated-panel hover:elevated-panel-lg transition-all duration-200 font-semibold leading-snug text-neutral-700 dark:text-neutral-200">Previews</button>
            </div>
            <div className="mt-3 text-lg font-extrabold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 sm:text-xl">{e.titulo}</div>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">📅 {e.fecha}</div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">🏫 {e.colegio}</div>
            <div className="mt-3 text-xs text-neutral-400 dark:text-neutral-500 font-semibold leading-relaxed">{e.created}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhotosSection() {
  return (
    <section className="space-y-4" id="fotos">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight leading-tight text-neutral-800 dark:text-neutral-100 sm:text-2xl">Gestión de fotos</h2>
        <div className="flex items-center gap-3">
          <button className="h-9 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-slate-700/80 px-4 text-sm elevated-panel hover:elevated-panel-lg transition-all duration-200 font-semibold leading-snug text-neutral-700 dark:text-neutral-200">Actualizar</button>
          <button className="h-9 rounded-xl border border-blue-200/60 dark:border-blue-700/60 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 text-sm elevated-panel-lg hover:elevated-panel-xl transition-all duration-200 font-bold tracking-tight leading-tight">Subir fotos</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {fotos.map((p, i) => (
          <div key={i} className="group rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/95 dark:bg-slate-700/95 p-3 elevated-panel hover:elevated-panel-lg transition-all duration-200 hover:-translate-y-1">
            <div className="relative aspect-[4/3] rounded-lg bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 overflow-hidden grid place-items-center text-neutral-400 dark:text-neutral-500 elevated-panel">
              {/* placeholder de imagen */}
              <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-600 elevated-panel" />
              <span className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 elevated-panel font-medium">{p.status}</span>
              <input type="checkbox" className="absolute top-2 right-2 size-4 accent-indigo-600 dark:accent-indigo-400" />
            </div>
            <div className="px-1 py-3">
              <div className="truncate text-sm text-neutral-800 dark:text-neutral-200 font-semibold leading-snug">{p.name}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{p.size} • {p.date}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Iconos simples (inline, sin libs) ---
function IconCalendar() {
  return (<svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h3V2zm13 8H4v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10zM4 9h16V6H4v3z"/></svg>);
}
function IconCamera() {
  return (<svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M9 3h6l1 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l1-2zm3 5a5 5 0 1 0 0 10a5 5 0 0 0 0-10z"/></svg>);
}
function IconUsers() {
  return (<svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M16 11a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm-8 6a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm8 0a6 6 0 0 1 6 6H10a6 6 0 0 1 6-6Zm-8 0a6 6 0 0 1 6 6H2a6 6 0 0 1 6-6Z"/></svg>);
}
function IconBox() {
  return (<svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M21 8.5V18a2 2 0 0 1-1.2 1.8l-6.8 3.1a2 2 0 0 1-1.6 0L3.6 19.8A2 2 0 0 1 2.4 18V8.5l8.8 4V22l.8.4l.8-.4V12.5zM12 2l9 4.2l-9 4.2L3 6.2z"/></svg>);
}

function MobileBottomNav() {
  const mobileItems = [
    { label: 'Dashboard', icon: '📊', href: '#dashboard' },
    { label: 'Eventos', icon: '📅', href: '#eventos' },
    { label: 'Fotos', icon: '📸', href: '#fotos' },
    { label: 'Más', icon: '⚙️', href: '#' }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass border-t border-white/20 dark:border-white/10 px-3 py-3 elevated-panel-xl">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all duration-200 min-w-0 elevated-panel hover:elevated-panel-lg"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-semibold leading-tight text-neutral-700 dark:text-neutral-200 truncate sm:text-xs">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}