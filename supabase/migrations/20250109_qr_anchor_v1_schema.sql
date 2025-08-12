-- QR Anchor V1 Schema: courses, codes y extensiones de photos
-- Generado para rama feat/qr-anchor-v1-schema

-- Tabla courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  grade text null,
  section text null,
  created_at timestamptz not null default now()
);
create index if not exists idx_courses_event on public.courses(event_id);

-- Tabla codes
create table if not exists public.codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  course_id uuid null references public.courses(id) on delete set null,
  code_value text not null,
  token text unique null,
  is_published boolean not null default false,
  title text null,
  created_at timestamptz not null default now(),
  unique(event_id, code_value)
);
create index if not exists idx_codes_event on public.codes(event_id);
create index if not exists idx_codes_course on public.codes(course_id);

-- Extensión de photos
alter table public.photos
  add column if not exists code_id uuid null references public.codes(id) on delete set null,
  add column if not exists is_anchor boolean not null default false,
  add column if not exists anchor_raw text null;

create index if not exists idx_photos_event_created on public.photos(event_id, created_at);
create index if not exists idx_photos_code on public.photos(code_id);
create index if not exists idx_photos_is_anchor on public.photos(is_anchor);

-- RLS: habilitar si no lo estuviera (respetar políticas existentes)
alter table public.courses enable row level security;
alter table public.codes enable row level security;



