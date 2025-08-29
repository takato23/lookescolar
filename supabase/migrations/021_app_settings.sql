-- App Settings System: Singleton configuration with audit trail and JWT-based RLS
-- Created: 2024-12-28
-- Purpose: Centralized application settings with security and audit capabilities

create extension if not exists pgcrypto;

-- Utility function to update updated_at timestamp
create or replace function public.set_updated_at() 
returns trigger 
language plpgsql
security definer
as $$
begin 
  new.updated_at = now(); 
  return new; 
end;
$$;

-- Audit table for tracking settings changes
create table if not exists public.app_settings_audit (
  id bigserial primary key,
  changed_at timestamptz default now(),
  changed_by uuid references auth.users(id),
  operation text check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb
);

-- Main settings table (singleton pattern)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1), -- Enforce singleton

  -- Business Information
  business_name text not null default 'LookEscolar',
  business_email text check (business_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  business_phone text,
  business_address text,
  business_website text check (business_website ~* '^https?://'),

  -- Watermark Configuration
  watermark_text text not null default '© LookEscolar',
  watermark_position text not null default 'bottom-right' 
    check (watermark_position in ('bottom-right','bottom-left','top-right','top-left','center')),
  watermark_opacity int not null default 70 
    check (watermark_opacity between 10 and 100),
  watermark_size text not null default 'medium' 
    check (watermark_size in ('small','medium','large')),

  -- Upload Limits
  upload_max_size_mb int not null default 10 
    check (upload_max_size_mb between 1 and 50),
  upload_max_concurrent int not null default 5 
    check (upload_max_concurrent between 1 and 10),
  upload_quality int not null default 72 
    check (upload_quality between 50 and 100),
  upload_max_resolution int not null default 1920 
    check (upload_max_resolution in (1600, 1920, 2048)),

  -- Pricing Configuration
  default_photo_price_ars int not null default 500 
    check (default_photo_price_ars >= 0),
  bulk_discount_percentage int not null default 10 
    check (bulk_discount_percentage between 0 and 50),
  bulk_discount_minimum int not null default 5 
    check (bulk_discount_minimum >= 2),
  pack_price_ars int not null default 2000 
    check (pack_price_ars >= 0),

  -- Notification Preferences
  notify_new_orders boolean not null default true,
  notify_payments boolean not null default true,
  notify_weekly_report boolean not null default true,
  notify_storage_alerts boolean not null default true,

  -- Localization Settings
  timezone text not null default 'America/Argentina/Buenos_Aires',
  date_format text not null default 'DD/MM/YYYY' 
    check (date_format in ('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD')),
  currency text not null default 'ARS' 
    check (currency in ('ARS','USD','EUR')),
  language text not null default 'es' 
    check (language in ('es','en')),

  -- System Configuration
  auto_cleanup_previews boolean not null default true,
  cleanup_preview_days int not null default 90 
    check (cleanup_preview_days >= 1),

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- trigger updated_at
drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Enhanced audit function with operation tracking
create or replace function public.audit_app_settings() 
returns trigger 
language plpgsql
security definer
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.app_settings_audit(changed_by, operation, before_data, after_data)
    values (auth.uid(), tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.app_settings_audit(changed_by, operation, after_data)
    values (auth.uid(), tg_op, to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.app_settings_audit(changed_by, operation, before_data)
    values (auth.uid(), tg_op, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_app_settings on public.app_settings;
create trigger trg_audit_app_settings
  after update on public.app_settings
  for each row execute function public.audit_app_settings();

-- Enable Row Level Security
alter table public.app_settings enable row level security;
alter table public.app_settings_audit enable row level security;

-- RLS Policy: Only admin users can access settings
-- Uses JWT claim 'role' to avoid expensive joins
drop policy if exists "app_settings_admin_access" on public.app_settings;
create policy "app_settings_admin_access" on public.app_settings
  for all
  using ( 
    coalesce((auth.jwt() ->> 'role') = 'admin', false) 
    or auth.uid() in (
      select id from auth.users 
      where (raw_user_meta_data ->> 'role') = 'admin'
    )
  )
  with check ( 
    coalesce((auth.jwt() ->> 'role') = 'admin', false)
    or auth.uid() in (
      select id from auth.users 
      where (raw_user_meta_data ->> 'role') = 'admin'
    )
  );

-- RLS Policy: Audit table access for admins only
drop policy if exists "app_settings_audit_admin_read" on public.app_settings_audit;
create policy "app_settings_audit_admin_read" on public.app_settings_audit
  for select
  using (
    coalesce((auth.jwt() ->> 'role') = 'admin', false)
    or auth.uid() in (
      select id from auth.users 
      where (raw_user_meta_data ->> 'role') = 'admin'
    )
  );

-- Create indexes for performance
create index if not exists idx_app_settings_audit_changed_at 
  on public.app_settings_audit(changed_at desc);
create index if not exists idx_app_settings_audit_changed_by 
  on public.app_settings_audit(changed_by);

-- Initialize singleton row with default values
insert into public.app_settings(id, created_at, updated_at) 
values (1, now(), now())
on conflict (id) do nothing;

-- Add helpful comments
comment on table public.app_settings is 'Application settings - singleton pattern (only one row allowed)';
comment on table public.app_settings_audit is 'Audit trail for settings changes';
comment on column public.app_settings.id is 'Always 1 - enforces singleton pattern';
comment on column public.app_settings.updated_by is 'User who last updated the settings';