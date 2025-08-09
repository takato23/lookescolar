-- EXIF taken at support for photos
alter table public.photos
  add column if not exists exif_taken_at timestamptz null;

create index if not exists idx_photos_exif on public.photos(exif_taken_at);


