# AGENTS.md — Simple Web (TelegramStorage)

> **Read this file before changing code.** Cross-tool onboarding (Cursor, Claude Code, OpenCode, Antigravity, Copilot, etc.).
> Full detail: [`CLAUDE.md`](CLAUDE.md) · Deep-dive skills: [`.cursor/skills/`](.cursor/skills/) (Cursor also loads [`.agents/skills/`](.agents/skills/) when present).

## What is this project?

Monorepo for **file storage on Telegram** (MTProto): **.NET 8** API + **Next.js 16 / React 19** web. Admin manages users, folders, and cloud files; uploads report progress; files can be streamed. **User-facing UI copy and error messages are Vietnamese** (product requirement).

| Part | Path | Dev URL |
|------|------|---------|
| API | `BE/TelegramStorage/` | `http://localhost:8080` |
| Web | `FE/` | `http://localhost:3000` |
| DB | SQL Server (Docker/local) | see `BE/docker-compose.yml` |

---

## Quick start

```bash
# API (from BE/)
dotnet run --project TelegramStorage
# Swagger dev: http://localhost:8080/swagger

# Web
cd FE && npm install && npm run dev
# Create FE/.env.local from .env.local.example:
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

Docker: see [`DOCKER.md`](DOCKER.md).

---

## Repo layout (30-second mental model)

```
simple-web/
├── AGENTS.md          ← you are here (all agents)
├── CLAUDE.md          ← detailed guide + checklist
├── BE/
│   ├── TelegramStorage/                 # Controllers, Program, Middleware
│   ├── TelegramStorage.Application/     # DTOs, I*Service, Validators, AutoMapper
│   ├── TelegramStorage.Domain/          # Entities (BaseEntity…)
│   └── TelegramStorage.Infrastructure/  # EF, Services, Migrations
└── FE/src/
    ├── app/(auth)|(admin)|(client)/     # Routes
    ├── services/                        # API calls (one file per resource)
    ├── hooks/api/                       # React Query
    ├── types/                           # DTOs aligned with BE
    ├── lib/api-client.ts                # apiFetch, ApiError
    └── components/ui/                   # shadcn
```

**BE:** `Controller → I*Service (Application) → Impl (Infrastructure) → DbContext/Telegram`  
**FE:** `page → hooks/api → services → apiFetch → /v1/api/...`

---

## Stack (do not guess versions)

| BE | FE |
|----|-----|
| .NET 8, EF Core 8, SQL Server | Next.js **16.2**, React **19**, TS strict |
| FluentValidation, AutoMapper, JWT | TanStack Query 5, Redux (theme/UI) |
| WTelegramClient, ImageSharp, FFmpeg | Tailwind 4, shadcn/Radix, sonner |

**Next.js 16:** APIs differ from older versions — before FE work, read `FE/node_modules/next/dist/docs/` (see [`FE/AGENTS.md`](FE/AGENTS.md)).

---

## API contract (FE ↔ BE must match)

- **Prefix:** `/v1/api/[Controller]` (e.g. `/v1/api/Folders/tree`)
- **JSON camelCase**, envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "errors": [],
  "statusCode": 200
}
```

- **FE:** `FE/src/lib/api-client.ts` — `apiFetch` returns `data`; failures throw `ApiError`
- **BE:** `BaseController` — `OkResponse`, `FailResponse`, `NotFoundResponse`
- **Auth:** `POST /v1/api/Auth/login` → JWT header `Authorization: Bearer <token>`
- **Upload progress:** header `X-Ndjson-Upload-Progress: 1`, FE `apiUploadFormDataNdjson`

BE errors: `KeyNotFoundException` → 404, `InvalidOperationException` → 400 (`ExceptionHandlingMiddleware`).

---

## Coding rules (always apply)

1. Change only files relevant to the task — no drive-by refactors.
2. **Never commit** `.env`, `telegram.session`, or secrets.
3. Add/change API → update **BE DTO + service + controller** and **FE types + service + hook**.
4. Controllers stay **thin** — no business logic, no direct DbContext (except existing patterns like `FolderService`).
5. Validators live in `Application/Validators`; DI registers them automatically.
6. FE: do not call `fetch` directly in pages when `services/*` exists.
7. **User-visible strings:** Vietnamese (labels, toasts, API messages shown in UI).
8. Auth UI: `ds-*` classes (`FE/src/app/globals.css`, [`FE/DESIGN.md`](FE/DESIGN.md)); admin: shadcn + Tailwind semantic tokens (`bg-card`, `text-muted-foreground`).
9. Do not commit unless the user explicitly asks.

---

## Adding a feature — file order

**Backend**

1. `Domain/Entities/` (+ DbContext if needed)
2. `Application/DTOs/`, `Interfaces/Services/`, `Validators/`
3. `Infrastructure/Services/` + register in `DependencyInjection.cs`
4. `TelegramStorage/Controllers/` action with `[Authorize]` when needed
5. `dotnet ef migrations add ...` if schema changes (`Infrastructure/Migrations/`)

**Frontend**

1. `src/types/`
2. `src/services/*-service.ts` (`BASE = "/v1/api/..."`)
3. `src/hooks/api/use-*.ts` + `queryKeys`, toast on `ApiError`
4. Page/component under `src/app/`

**End-to-end reference:** Folders — `FoldersController`, `folder-service.ts`, `use-folders.ts`, `admin/folders/page.tsx`.

---

## Skills & extended docs

Read a skill for specialized work (`.cursor/skills/` or `.agents/skills/`):

| Skill | Use when |
|-------|----------|
| `simple-web-backend` | C#, controllers, EF, validators |
| `simple-web-frontend` | Next.js, hooks, services |
| `simple-web-api-contract` | Endpoints, type sync |
| `simple-web-ef-migrations` | SQL Server migrations |
| `simple-web-ui` | `ds-*`, shadcn, DESIGN.md |
| `simple-web-telegram-cloud` | Upload, stream, Telegram |

| Doc | Contents |
|-----|----------|
| [`CLAUDE.md`](CLAUDE.md) | Full guide, checklist, libraries |
| [`FE/DESIGN.md`](FE/DESIGN.md) | Design tokens, `ds-*` classes |
| [`FE/AGENTS.md`](FE/AGENTS.md) | Next.js 16 warning |
| [`DOCKER.md`](DOCKER.md) | Containers, prod env |

---

## Quick file reference

| Purpose | File |
|---------|------|
| API envelope | `BE/.../Common/Models/ApiResponse.cs` |
| Route base | `BE/TelegramStorage/Controllers/BaseController.cs` |
| FE HTTP | `FE/src/lib/api-client.ts` |
| BE DI | `BE/.../Infrastructure/DependencyInjection.cs` |
| DbContext | `BE/.../Data/TelegramStorageDbContext.cs` |
