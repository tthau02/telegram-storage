---
name: simple-web-frontend
description: >-
  Builds Next.js 16 and React 19 UI for simple-web — App Router, React Query,
  services, Redux, shadcn/ui, Tailwind 4. Use when editing FE/, pages, hooks,
  components, or TypeScript types.
---

# Simple Web — Frontend

## Next.js 16 (bắt buộc đọc trước)

Dự án dùng **Next.js 16** — API có thể khác training data. Trước khi code:

1. Đọc guide trong `FE/node_modules/next/dist/docs/` cho feature đang dùng.
2. Tuân thủ deprecation trong docs đó.

`FE/AGENTS.md` nhắc điều này.

## Cấu trúc route

```
src/app/
  (auth)/login, register     # Auth layout
  (admin)/admin/*            # Admin shell + sidebar
  (client)/                  # Public client
  layout.tsx                 # AppProviders, Inter font, lang=vi
```

## Thêm API consumer (chuẩn dự án)

### 1. Types — `src/types/xxx.ts`

Mirror DTO BE (PascalCase BE → camelCase TS).

### 2. Service — `src/services/xxx-service.ts`

```typescript
import { apiFetch } from "@/lib/api-client";
import type { XxxDto } from "@/types/xxx";

const BASE = "/v1/api/Xxx";

export const xxxService = {
  list(token?: string): Promise<XxxDto[]> {
    return apiFetch<XxxDto[]>(BASE, { method: "GET", token });
  },
};
```

### 3. Hooks — `src/hooks/api/use-xxx.ts`

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { xxxService } from "@/services/xxx-service";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

export const xxxQueryKeys = {
  all: ["xxx"] as const,
  list: (token?: string) => ["xxx", "list", token] as const,
};

export function useXxxListQuery(token?: string) {
  return useQuery({
    queryKey: xxxQueryKeys.list(token),
    queryFn: () => xxxService.list(token),
    enabled: Boolean(token),
  });
}
```

- `onSuccess`: `invalidateQueries` + `toast.success` (tiếng Việt).
- `onError`: `err instanceof ApiError` → `toast.error`.

### 4. Page — `"use client"` khi dùng hooks

Lấy token từ `getAuthToken()` / pattern hiện có trong admin pages.

## UI components

- Primitives: `src/components/ui/` (shadcn).
- Shared admin: `src/components/shared/common/`.
- Class merge: `cn()` từ `@/lib/utils`.
- Auth / brand surfaces: class `ds-*` — xem skill `simple-web-ui`.

## State

| Loại | Công cụ |
|------|---------|
| Server/API | React Query |
| Theme, UI chrome | Redux (`store/slices/`) |

Không duplicate server state trong Redux.

## Env

- `NEXT_PUBLIC_API_URL` — base API (dev: `http://localhost:8080`).
- Copy từ `FE/.env.local.example`.

## Scripts

```bash
cd FE && npm run dev      # webpack dev
npm run dev:turbo         # turbopack
npm run lint
```

## Tham chiếu

- `FE/src/hooks/api/use-folders.ts`
- `FE/src/services/folder-service.ts`
- `FE/src/lib/api-client.ts`
- `FE/src/app/(admin)/admin/folders/page.tsx`
