-- Add QR settings to app_settings
alter table public.app_settings
  add column if not exists qr_default_size text not null default 'medium'
    check (qr_default_size in ('small', 'medium', 'large')),
  add column if not exists qr_detection_sensitivity text not null default 'medium'
    check (qr_detection_sensitivity in ('low', 'medium', 'high')),
  add column if not exists qr_auto_tag_on_upload boolean not null default true,
  add column if not exists qr_show_in_gallery boolean not null default false;

comment on column public.app_settings.qr_default_size is 'Default QR size for generated student codes';
comment on column public.app_settings.qr_detection_sensitivity is 'QR detection sensitivity (low/medium/high)';
comment on column public.app_settings.qr_auto_tag_on_upload is 'Auto-detect and tag QR during uploads';
comment on column public.app_settings.qr_show_in_gallery is 'Show QR hints in gallery UI';
