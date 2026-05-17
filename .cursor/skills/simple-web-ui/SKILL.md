---
name: simple-web-ui
description: >-
  Applies simple-web UI patterns — Starbucks-inspired design tokens, ds-*
  component classes, shadcn/ui, Tailwind 4 semantic colors, Vietnamese user
  copy. Use when styling pages, auth flows, admin UI, or components in FE/.
---

# UI — Design System

## Source of truth

Read `FE/DESIGN.md` for palette, typography, do/don't.

Implementation: CSS variables in `FE/src/app/globals.css` + `ds-*` classes.

## When to use what

| Context | Approach |
|---------|----------|
| Auth (login/register) | `ds-auth-*`, `ds-btn-primary-pill`, `ds-auth-input` |
| Elevated card on cream canvas | `ds-surface-card-elevated` |
| Admin (folders, users, cloud) | shadcn `components/ui/*` + semantic Tailwind (`bg-card`, `border-border`) |
| Form errors | `ds-field-error`, `ds-text-error` |

## Tailwind rules

- Use semantic tokens: `text-foreground`, `bg-muted`, `text-destructive`.
- Avoid raw hex unless defined in `:root`.
- Auth pill button: `ds-btn-primary-pill` (50px radius, `active:scale-95`).
- Icons: `lucide-react`, `size-4` / `size-3.5` in menus.

## shadcn

- Primitives: `FE/src/components/ui/`.
- Extend via `className` + `cn()`; avoid unnecessary forks.

## Copy language

- Labels, toasts, dialogs: **Vietnamese** (product requirement).
- `aria-label` should describe the action (e.g. `Thao tác cho ${name}`).

## Admin layout

- Shell: `AdminShell`, sidebar `admin-nav.ts`.
- Tables: `common-table.tsx`, filter `table-filter.tsx`.

## Adding a new primitive

1. Add CSS variable to `:root` in `globals.css` if needed.
2. Add `ds-*` class under `@layer components`.
3. Document briefly in `DESIGN.md` §10 if reusable.

## References

- `FE/DESIGN.md` §10 (`ds-*` table)
- `FE/src/app/globals.css`
- `FE/src/app/(auth)/login/login-view.tsx`
- `FE/src/app/(admin)/admin/folders/page.tsx`
