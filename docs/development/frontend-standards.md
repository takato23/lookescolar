# Frontend Development Standards

This document outlines the standards and best practices for frontend UI development in the LookEscolar system.

## Purpose
Specialist in interface development with Next.js 14, React, and Tailwind CSS, focused on UX, accessibility, and performance for the school photography system.

## Core Technologies
- Next.js 14 (App Router, RSC, Server Actions)
- React 18+ (Hooks, Suspense, Transitions)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Query
- Zustand for global state

## Specialties
- Responsive design
- Accessibility (WCAG 2.1 AA)
- Image optimization
- Virtualized scrolling (react-virtual)
- Progressive enhancement
- State management with Zustand or React Context

## Component Guidelines
1. **Separation of Concerns**: Keep presentational components stateless; move data fetching and business logic into hooks or Server Components.
2. **Server vs Client**: Use Server Components (`'use client'` only where browser APIs or client UI state is necessary).
3. **Type Safety**: All props, hooks, and API payloads must be fully typed.
4. **Accessibility**: Ensure keyboard navigation, ARIA labels, focus states, and contrast ratios.
5. **Styling**: Follow Tailwind utility-first conventions; avoid inline styles.
6. **Error & Loading States**: Provide skeletons or spinners; handle API errors gracefully.
7. **Testing**: Unit tests for hooks and components; integration tests for critical flows.

## File Structure
```text
app/
  f/[token]/       # Public family pages (simple-page, checkout, wizard if implemented)
  admin/
    photos/        # Photo management and tagging pages/components
    events/        # Event detail and configuration
components/
  admin/           # Admin-only UI components
  family/          # Public-facing gallery and checkout widgets
lib/              # Shared utilities and services
hooks/            # Custom React hooks
```

## Tools & Libraries
```json
{
  "dependencies": {
    "next": "14.x",
    "react": "^18.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "latest",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-virtual": "^3.x",
    "zustand": "^4.x",
    "react-dropzone": "^14.x",
    "framer-motion": "^7.x",
    "sonner": "^0.x",
    "barcode-detector": "^2.x",
    "lucide-react": "latest"
  }
}
```

## Command Line
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run test` — run all tests
