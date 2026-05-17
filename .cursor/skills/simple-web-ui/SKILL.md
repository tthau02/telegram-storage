---
name: simple-web-ui
description: >-
  Applies simple-web UI patterns — Starbucks-inspired design tokens, ds-*
  component classes, shadcn/ui, Tailwind 4 semantic colors, Vietnamese copy.
  Use when styling pages, auth flows, admin UI, or components in FE/.
---

# UI — Design System

## Tài liệu gốc

Đọc `FE/DESIGN.md` cho palette, typography, do/don't.

Implementation: CSS variables trong `FE/src/app/globals.css` + class `ds-*`.

## Khi nào dùng gì

| Ngữ cảnh | Cách làm |
|----------|----------|
| Auth (login/register) | `ds-auth-*`, `ds-btn-primary-pill`, `ds-auth-input` |
| Card nổi trên nền cream | `ds-surface-card-elevated` |
| Admin (folders, users, cloud) | shadcn `components/ui/*` + Tailwind semantic (`bg-card`, `border-border`) |
| Lỗi form | `ds-field-error`, `ds-text-error` |

## Quy tắc Tailwind

- Dùng token semantic: `text-foreground`, `bg-muted`, `text-destructive`.
- Tránh hex trực tiếp trừ token đã định nghĩa trong `:root`.
- Nút pill auth: `ds-btn-primary-pill` (radius 50px, `active:scale-95`).
- Icon: `lucide-react`, size `size-4` / `size-3.5` trong menu.

## shadcn

- Component gốc: `FE/src/components/ui/`.
- Mở rộng bằng `className` + `cn()`, không fork không cần thiết.

## Ngôn ngữ

- Label, toast, dialog: **tiếng Việt**.
- `aria-label` mô tả hành động (vd. `Thao tác cho ${name}`).

## Admin layout

- Shell: `AdminShell`, sidebar `admin-nav.ts`.
- Bảng: `common-table.tsx`, filter `table-filter.tsx`.

## Thêm primitive mới

1. Thêm CSS variable vào `:root` trong `globals.css` (nếu cần).
2. Thêm class `ds-*` trong `@layer components`.
3. Ghi chú ngắn trong `DESIGN.md` §10 nếu là primitive tái sử dụng.

## Tham chiếu

- `FE/DESIGN.md` §10 (`ds-*` table)
- `FE/src/app/globals.css`
- `FE/src/app/(auth)/login/login-view.tsx`
- `FE/src/app/(admin)/admin/folders/page.tsx`
