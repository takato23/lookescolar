# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js routes, server actions, and `app/api/*` endpoints.
- `components/`: UI and feature components (`ui/`, `admin/`, `gallery/`, `qr/`).
- `lib/`: shared utilities (Supabase client, services, helpers).
- `hooks/`: reusable React hooks.
- `scripts/`: TypeScript/Node operational scripts (DB, tests, ops).
- `supabase/`: local dev setup, migrations, seeds, config.
- `public/`: static assets. `styles/`: Tailwind config and globals.
- `__tests__/`, `tests/`: unit/integration/e2e suites (Vitest/Playwright).
- `docs/`: architecture, operations, and resources.

## Build, Test, and Development Commands
- `npm run dev`: start local dev at `http://localhost:3000`.
- `npm run build` / `npm start`: production build and run.
- `npm run lint` / `npm run typecheck`: lint TS/React and type safety.
- `npm test` | `npm run test:watch` | `npm run test:coverage`: unit/integration.
- `npm run test:e2e`: e2e suites; `npm run test:usability:workflows`: Playwright flows.
- DB: `npm run dev:db`, `npm run db:migrate`, `npm run db:reset`, `npm run db:types`.

## Coding Style & Naming Conventions
- Prettier: 2 spaces, semicolons, single quotes, width 80. Run `npm run lint` before PRs.
- ESLint: Next.js rules; prefer `const`, no `var`; warns on `any`/unused vars.
- Files: use kebab-case for files (e.g., `components/ui/alert-dialog.tsx`).
  Export React components in PascalCase.
- Imports: use alias `@` for project root (e.g., `@/lib/...`).
- Tailwind: class order enforced by `prettier-plugin-tailwindcss`.

## Testing Guidelines
- Frameworks: Vitest (JSDOM by default), Playwright for usability/e2e.
- Test files: `*.test.ts[x]` under `__tests__/` or `tests/`.
- Setup: `vitest.setup.ts` handles globals and environment.
- Quick checks: `npm run test:components`, `npm run test:apis` for targeted runs.
- Coverage: add/maintain tests for changed code; use `npm run test:coverage` for reports.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat(gallery): add virtual grid`, `fix(api): handle 429`). Avoid `WIP` on main; imperative, concise subjects.
- PRs: link issues; describe intent/scope; note env/DB changes; include screenshots for UI changes; and verify: `npm run lint`, `npm run typecheck`, `npm test`.
- Update `docs/` when behavior or APIs change.

## Security & Configuration Tips
- Secrets: never commit keys; use `.env.local` (see `.env.example`).
- Database: after schema changes, run `npm run db:types` and commit `types/database.ts`.
- Health: `npm run health:check` for local API readiness.

