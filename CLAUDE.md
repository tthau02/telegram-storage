# Simple Web (TelegramStorage) — AI Agent Guide

> Fast onboarding for any agent: [`AGENTS.md`](AGENTS.md). This file is the detailed reference.

Monorepo for Telegram-backed cloud storage: **BE** (.NET 8) + **FE** (Next.js 16 / React 19). Vietnamese UI copy; unified API envelope.

## Project overview

| Component | Description |
|-----------|-------------|
| **BE** | ASP.NET Core API, SQL Server, JWT, upload/stream via Telegram (WTelegramClient) |
| **FE** | Admin + auth + client; API via `apiFetch`, React Query, Redux (theme/UI) |
| **Docker** | `BE/docker-compose.yml` — SQL Server + API; FE dev `:3000`, API `:8080` |

See also: [DOCKER.md](DOCKER.md), UI design [FE/DESIGN.md](FE/DESIGN.md), Next.js [FE/AGENTS.md](FE/AGENTS.md).

---

## Main libraries

### Backend (`BE/`)

| Package | Role |
|---------|------|
| **.NET 8** | Runtime |
| **EF Core 8 + SQL Server** | ORM, migrations |
| **FluentValidation** | Request validation (auto-validation) |
| **AutoMapper** | Entity ↔ DTO |
| **JWT Bearer** | API authentication |
| **Swashbuckle** | Swagger (Development) |
| **WTelegramClient** | Telegram MTProto |
| **SixLabors.ImageSharp** | Thumbnails |
| **Xabe.FFmpeg** | Media processing (mirror/yt-dlp) |
| **ASP.NET Identity PasswordHasher** | User password hashing |

### Frontend (`FE/`)

| Package | Role |
|---------|------|
| **Next.js 16.2** | App Router — **read `node_modules/next/dist/docs/` before coding** (APIs differ from older versions) |
| **React 19** | UI |
| **TypeScript 5** | strict mode |
| **Tailwind CSS 4** | Styling + `@layer components` (`ds-*`) |
| **shadcn / Radix / Base UI** | Primitives (`src/components/ui/`) |
| **TanStack React Query 5** | Server state, cache, mutations |
| **Redux Toolkit** | Theme, UI slice |
| **lucide-react** | Icons |
| **sonner** | Toasts |
| **date-fns, react-day-picker** | Dates |
| **class-variance-authority, clsx, tailwind-merge** | Utilities (`cn()` in `lib/utils.ts`) |

---

## Source layout

```
simple-web/
├── AGENTS.md                 # Short onboarding (all AI agents)
├── CLAUDE.md                 # This file (detailed)
├── DOCKER.md
├── BE/
│   ├── TelegramStorage/              # Web host: Controllers, Program.cs, Middleware
│   ├── TelegramStorage.Application/  # DTOs, Interfaces, Validators, AutoMapper, Options
│   ├── TelegramStorage.Domain/       # Entities (BaseEntity, Folder, CloudFile, User…)
│   ├── TelegramStorage.Infrastructure/ # EF DbContext, Repositories, Services, Migrations
│   └── docker-compose.yml
└── FE/
    ├── AGENTS.md             # Next.js 16 warning
    ├── DESIGN.md             # Design tokens + ds-* classes
    └── src/
        ├── app/              # Route groups: (auth), (admin), (client)
        ├── components/       # ui/ (shadcn), admin/, client/, shared/
        ├── config/           # routes, admin-nav, branding
        ├── constants/
        ├── hooks/api/        # React Query hooks + query keys
        ├── lib/              # api-client, auth-storage, utils, toast
        ├── providers/        # Query, Redux, theme
        ├── services/         # API layer (one service per resource)
        ├── store/            # Redux slices
        └── types/            # TypeScript DTOs matching BE
```

### BE dependency flow (Clean Architecture)

```
Controller → I*Service (Application) → Implementation (Infrastructure) → DbContext / Telegram
                ↑
         FluentValidator, AutoMapper
```

- **Domain**: entities only; no references to other layers.
- **Application**: contracts + DTOs + validators; no Infrastructure reference.
- **Infrastructure**: EF, Telegram, service implementations.
- **TelegramStorage (API)**: thin controllers, middleware, DI wiring.

### FE flow

```
page.tsx → hooks/api (useQuery/useMutation) → services/* → apiFetch → BE /v1/api/...
```

- JWT from `auth-storage`, pass `token` into services/hooks.
- Do not call `fetch` directly in pages when a service exists.

---

## API conventions (FE ↔ BE)

### Route prefix

All controllers inherit `BaseController`:

```csharp
[Route("v1/api/[controller]")]
```

Example: `FoldersController` → `/v1/api/Folders/tree`.

### JSON envelope (camelCase)

```json
{
  "success": true,
  "message": "...",
  "data": { },
  "errors": ["..."],
  "statusCode": 200
}
```

- FE: `apiFetch` in `FE/src/lib/api-client.ts` unwraps `data`, throws `ApiError` when `success === false`.
- BE: `OkResponse`, `FailResponse`, `NotFoundResponse` on `BaseController`.

### Auth

- Login: `POST /v1/api/Auth/login` → JWT.
- Header: `Authorization: Bearer <token>`.
- Protected controllers: `[Authorize]`.

### Telegram upload progress

- Header: `X-Ndjson-Upload-Progress: 1` (constant `NDJSON_UPLOAD_PROGRESS_HEADER` on FE).
- FE uses `apiUploadFormDataNdjson` (XHR + NDJSON stream).

---

## Code format & style

### Backend (C#)

- `Nullable enable`, file-scoped namespaces where appropriate.
- Controllers: **no** business logic; map request → service → `ApiResponse` only.
- New CRUD services: prefer `AppServiceBase` + `IUnitOfWork` / `Repo<T>()`.
- Validation: `AbstractValidator<T>` in `Application/Validators`, registered via `AddValidatorsFromAssembly`.
- Business errors: `KeyNotFoundException` (404), `InvalidOperationException` (400) — mapped by `ExceptionHandlingMiddleware`.
- User-facing messages: **Vietnamese** (match FE toasts and existing API strings).
- Migrations: under `TelegramStorage.Infrastructure/Migrations`, applied on API start (`MigrateAsync`).

### Frontend (TypeScript / React)

- `"use client"` only when hooks/events are needed; prefer server layout/page when possible.
- Import alias: `@/` → `src/`.
- **Services**: `const xxxService = { ... }`, `BASE = "/v1/api/..."`.
- **Hooks**: `useXxxQuery` / `useXxxMutation` in `hooks/api/`, `queryKeys` in same module or dedicated file.
- **Types**: mirror BE DTOs in `src/types/`.
- UI: prefer `components/ui/*`; design system `ds-*` from `globals.css` (DESIGN.md §10).
- Tailwind: semantic tokens (`bg-card`, `text-muted-foreground`); avoid ad-hoc hex unless tokenized.
- API errors: `instanceof ApiError` + `sonner` toast (see `use-folders.ts`).

### ESLint

```bash
cd FE && npm run lint
```

Uses `eslint-config-next` (core-web-vitals + typescript).

---

## Project rules (required)

1. **Scope**: Change only code required for the task; no unrelated refactors.
2. **Secrets**: Never commit `.env`, `telegram.session`, production connection strings.
3. **Commits**: Only when the user explicitly requests.
4. **API contract**: BE field changes → update FE `types/`, `services/`, hooks.
5. **Next.js 16**: Do not assume legacy Pages Router APIs; read `node_modules/next/dist/docs/`.
6. **CORS**: BE `Cors:AllowedOrigins`; dev defaults include `localhost:3000`.
7. **UI language**: Vietnamese for labels, toasts, and user-visible errors.
8. **Design**: Auth/marketing panels use `ds-*`; admin uses shadcn + semantic Tailwind.
9. **Telegram session**: Sensitive — never commit to git.
10. **Docker prod**: Set `NEXT_PUBLIC_API_URL` to the public API URL when building the FE image.

---

## Run locally

```bash
# BE (from BE/ or docker compose)
dotnet run --project TelegramStorage

# FE
cd FE && npm install && npm run dev
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8080
```

Swagger (Development): `http://localhost:8080/swagger`.

---

## Repo skills (`.cursor/skills/`)

Read the matching skill for specialized tasks:

| Skill | Use when |
|-------|----------|
| `simple-web-backend` | Controllers, services, EF, validators |
| `simple-web-frontend` | Pages, hooks, services, Next.js 16 |
| `simple-web-api-contract` | Endpoints, FE type sync |
| `simple-web-ef-migrations` | DB schema, migrations |
| `simple-web-ui` | Components, `ds-*`, DESIGN.md |
| `simple-web-telegram-cloud` | Upload, stream, Telegram gateway |

---

## New feature checklist

**BE**

- [ ] Entity / DbContext update
- [ ] DTO + `I*Service` (Application)
- [ ] Validator (if request body)
- [ ] Implementation (Infrastructure) + DI registration
- [ ] Controller action + `[Authorize]` if needed
- [ ] Migration if schema changes

**FE**

- [ ] `types/*.ts`
- [ ] `services/*-service.ts`
- [ ] `hooks/api/use-*.ts` + query keys
- [ ] UI page/component
- [ ] Toast / loading / error states

---

## Quick references

- BE envelope: `TelegramStorage.Application/Common/Models/ApiResponse.cs`
- Base controller: `BE/TelegramStorage/Controllers/BaseController.cs`
- FE API client: `FE/src/lib/api-client.ts`
- End-to-end example: Folders — `FoldersController`, `folder-service.ts`, `use-folders.ts`, `admin/folders/page.tsx`
