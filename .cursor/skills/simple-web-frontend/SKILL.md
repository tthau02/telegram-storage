---
name: simple-web-frontend
description: >-
  Builds Next.js 16 and React 19 UI for simple-web — App Router, React Query,
  services, Redux, shadcn/ui, Tailwind 4. Use when editing FE/, pages, hooks,
  components, or TypeScript types.
---

# Simple Web — Frontend

## Next.js 16 (read first)

This project uses **Next.js 16** — APIs may differ from training data. Before coding:

1. Read guides in `FE/node_modules/next/dist/docs/` for the feature you touch.
2. Follow deprecations in those docs.

`FE/AGENTS.md` repeats this warning.

## Route structure

```
src/app/
  (auth)/login, register     # Auth layout
  (admin)/admin/*            # Admin shell + sidebar
  (client)/                  # Public client
  layout.tsx                 # AppProviders, Inter font, lang=vi
```

## Adding an API consumer (project standard)

### 1. Types — `src/types/xxx.ts`

Mirror BE DTOs (BE PascalCase → TS camelCase on the wire).

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

- `onSuccess`: `invalidateQueries` + `toast.success` (**Vietnamese** copy).
- `onError`: `err instanceof ApiError` → `toast.error`.

### 4. Page — `"use client"` when using hooks

Get token via `getAuthToken()` / existing admin page patterns.

## UI components

- Primitives: `src/components/ui/` (shadcn).
- Shared admin: `src/components/shared/common/`.
- Class merge: `cn()` from `@/lib/utils`.
- Auth / brand surfaces: `ds-*` classes — see skill `simple-web-ui`.

## State

| Kind | Tool |
|------|------|
| Server/API | React Query |
| Theme, UI chrome | Redux (`store/slices/`) |

Do not duplicate server state in Redux.

## Env

- `NEXT_PUBLIC_API_URL` — API base (dev: `http://localhost:8080`).
- Copy from `FE/.env.local.example`.

## Scripts

```bash
cd FE && npm run dev      # webpack dev
npm run dev:turbo         # turbopack
npm run lint
```

## References

- `FE/src/hooks/api/use-folders.ts`
- `FE/src/services/folder-service.ts`
- `FE/src/lib/api-client.ts`
- `FE/src/app/(admin)/admin/folders/page.tsx`
