## 2025-01-09

- fix(gallery): replace ModernPublicGallery with PublicGallery in `/app/gallery/[eventId]/page.tsx`.
- refactor(publish): remove `ModernPublishClientWrapper` fallback; default to `PublishClient` in `/app/admin/publish/page.tsx`.

## 2025-09-01

- feat(events): scaffold "Eventos 2.0" (Pixieset-like) — páginas de Albums, Students, Orders, Settings.
- fix(photos): CTA "Volver al evento" en /admin/photos cuando llega `?event_id=...`.
- chore(db): migración no destructiva `events.settings` JSONB.
- chore(config): unificación de paths en `tsconfig.json`.
- chore(deps): agrega `@dnd-kit/*` para PhotoAdmin.
