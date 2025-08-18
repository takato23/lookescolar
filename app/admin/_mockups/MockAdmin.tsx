'use client';
import * as React from 'react';

type Stat = { label: string; value: string; hint?: string };
type Action = { label: string; sub?: string; color: string; icon: JSX.Element };
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
  return (
    <div className="min-h-screen bg-[radial-gradient(40%_60%_at_20%_0%,rgba(124,58,237,0.12),transparent),radial-gradient(40%_60%_at_100%_0%,rgba(59,130,246,0.10),transparent)]">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 py-6">
          <Sidebar />
          <main className="space-y-10">
            <HeaderGradient />
            <DashboardSection />
            <EventsSection />
            <PhotosSection />
          </main>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-neutral-200/60">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-indigo-600 text-white grid place-items-center text-sm font-bold">LE</div>
          <div className="leading-tight">
            <div className="font-semibold">LookEscolar</div>
            <div className="text-xs text-neutral-500">Studio Profesional</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <input placeholder="Buscar..." className="hidden md:block h-9 w-72 rounded-xl border border-neutral-200 bg-white/70 px-3 outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="size-9 grid place-items-center rounded-xl border border-neutral-200 bg-white/70">⟳</div>
          <div className="size-9 grid place-items-center rounded-xl border border-neutral-200 bg-white/70">⚙️</div>
          <div className="size-9 grid place-items-center rounded-xl border border-neutral-200 bg-white/70">👤</div>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const items = [
    { label: 'Dashboard', badge: '↳ resumen' },
    { label: 'Eventos', badge: '↳ gestión' },
    { label: 'Carpetas', badge: '↳ por evento' },
    { label: 'Pedidos', badge: '↳ ventas' },
    { label: 'Publicar', badge: '↳ compartir' },
    { label: 'Ajustes', badge: '↳ sistema' }
  ];
  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-3">
      <nav className="space-y-1">
        {items.map((it) => (
          <a key={it.label} href={`#${it.label.toLowerCase()}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-50">
            <span className="font-medium text-neutral-800">{it.label}</span>
            <span className="text-xs text-neutral-500">{it.badge}</span>
          </a>
        ))}
      </nav>
      <div className="mt-6 rounded-xl border border-neutral-200 p-3 text-xs text-neutral-500">
        <div className="font-medium text-neutral-700">Sistema Activo</div>
        <div>v2.0.0 • Seguro • Privado</div>
      </div>
    </aside>
  );
}

function HeaderGradient() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-5">
      <div className="rounded-xl bg-[linear-gradient(120deg,rgba(99,102,241,0.10),rgba(168,85,247,0.10))] p-5">
        <div className="text-sm text-neutral-500">lunes, 18 de agosto de 2025</div>
        <h1 id="dashboard" className="mt-1 text-2xl font-semibold text-neutral-800">Panel de Administración</h1>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Dashboard Profesional</div>
            <h2 className="text-xl font-semibold text-neutral-800">Resumen de hoy</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-sm text-neutral-500">{s.label}</div>
              <div className="mt-1 text-2xl font-semibold text-neutral-800">{s.value}</div>
              {s.hint && <div className="text-xs text-neutral-500 mt-1">{s.hint}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {actions.map((a) => (
          <button key={a.label} className={`group rounded-2xl border border-neutral-200 bg-gradient-to-br ${a.color} text-white p-5 shadow-sm transition hover:shadow-md`}>
            <div className="flex items-center gap-4">
              <div className="size-11 grid place-items-center rounded-xl bg-white/20">{a.icon}</div>
              <div className="text-left">
                <div className="font-semibold">{a.label}</div>
                <div className="text-sm opacity-90">{a.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur">
        <div className="p-5">
          <div className="text-sm text-neutral-500 mb-3">Actividad Reciente</div>
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="size-8 grid place-items-center rounded-lg bg-neutral-100">•</span>
                  <div>
                    <div className="text-sm text-neutral-800">Actualización #{i + 1}</div>
                    <div className="text-xs text-neutral-500">Hace unos segundos</div>
                  </div>
                </div>
                <span className="text-neutral-300">→</span>
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
      <h2 className="text-xl font-semibold text-neutral-800">Eventos</h2>
      <div className="space-y-4">
        {eventos.map((e, i) => (
          <article key={i} className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{e.estado}</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-50 text-orange-700 border border-orange-200">Próximo</span>
              </div>
              <button className="h-8 rounded-xl border border-neutral-200 bg-white px-3 text-sm">Previews</button>
            </div>
            <div className="mt-2 text-lg font-semibold text-neutral-800">{e.titulo}</div>
            <div className="mt-1 text-sm text-neutral-500">📅 {e.fecha}</div>
            <div className="mt-1 text-sm text-neutral-500">🏫 {e.colegio}</div>
            <div className="mt-2 text-xs text-neutral-400">{e.created}</div>
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
        <h2 className="text-xl font-semibold text-neutral-800">Gestión de fotos</h2>
        <div className="flex items-center gap-2">
          <button className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm">Actualizar</button>
          <button className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm">Subir fotos</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {fotos.map((p, i) => (
          <div key={i} className="group rounded-xl border border-neutral-200 bg-white p-2 hover:shadow-sm transition">
            <div className="relative aspect-[4/3] rounded-lg bg-neutral-100 overflow-hidden grid place-items-center text-neutral-400">
              {/* placeholder de imagen */}
              <div className="size-10 rounded-full bg-neutral-200" />
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{p.status}</span>
              <input type="checkbox" className="absolute top-2 right-2 size-4 accent-indigo-600" />
            </div>
            <div className="px-1 py-2">
              <div className="truncate text-sm text-neutral-800">{p.name}</div>
              <div className="text-xs text-neutral-500">{p.size} • {p.date}</div>
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