# AGENTS.md — Simple Web (TelegramStorage)

> \*\*Đọc file này trước khi sửa code.
> Chi tiết đầy đủ: [`CLAUDE.md`](CLAUDE.md) · Skill chuyên sâu: [`.cursor/skills/`](.cursor/skills/) (Cursor cũng đọc [`.agents/skills/`](.agents/skills/) nếu có).

## Dự án là gì?

Monorepo **lưu trữ file trên Telegram** (MTProto): API **.NET 8** + web **Next.js 16 / React 19**. Admin quản lý user, folder, cloud file; upload có tiến độ; stream file. **UI & message lỗi: tiếng Việt.**

| Phần | Path                      | Dev URL                     |
| ---- | ------------------------- | --------------------------- |
| API  | `BE/TelegramStorage/`     | `http://localhost:8080`     |
| Web  | `FE/`                     | `http://localhost:3000`     |
| DB   | SQL Server (Docker/local) | xem `BE/docker-compose.yml` |

---

## Chạy nhanh

```bash
# API (từ BE/)
dotnet run --project TelegramStorage
# Swagger dev: http://localhost:8080/swagger

# Web
cd FE && npm install && npm run dev
# Tạo FE/.env.local từ .env.local.example:
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

Docker: xem [`DOCKER.md`](DOCKER.md).

---

## Cấu trúc repo (nhớ 30 giây)

```
simple-web/
├── AGENTS.md          ← bạn đang đọc (mọi agent)
├── CLAUDE.md          ← bản chi tiết + checklist
├── BE/
│   ├── TelegramStorage/                 # Controllers, Program, Middleware
│   ├── TelegramStorage.Application/     # DTO, I*Service, Validators, AutoMapper
│   ├── TelegramStorage.Domain/          # Entities (BaseEntity…)
│   └── TelegramStorage.Infrastructure/  # EF, Services, Migrations
└── FE/src/
    ├── app/(auth)|(admin)|(client)/     # Routes
    ├── services/                        # Gọi API (1 file / resource)
    ├── hooks/api/                       # React Query
    ├── types/                           # DTO khớp BE
    ├── lib/api-client.ts                # apiFetch, ApiError
    └── components/ui/                   # shadcn
```

**BE:** `Controller → I*Service (Application) → Impl (Infrastructure) → DbContext/Telegram`  
**FE:** `page → hooks/api → services → apiFetch → /v1/api/...`

---

## Stack (không đoán version)

| BE                                  | FE                                        |
| ----------------------------------- | ----------------------------------------- |
| .NET 8, EF Core 8, SQL Server       | Next.js **16.2**, React **19**, TS strict |
| FluentValidation, AutoMapper, JWT   | TanStack Query 5, Redux (theme/UI)        |
| WTelegramClient, ImageSharp, FFmpeg | Tailwind 4, shadcn/Radix, sonner          |

**Next.js 16:** API khác bản cũ — trước khi code FE, đọc `FE/node_modules/next/dist/docs/` (xem thêm [`FE/AGENTS.md`](FE/AGENTS.md)).

---

## API contract (bắt buộc khớp FE ↔ BE)

- **Prefix:** `/v1/api/[Controller]` (vd. `/v1/api/Folders/tree`)
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

- **FE:** `FE/src/lib/api-client.ts` — `apiFetch` trả `data`, lỗi → `ApiError`
- **BE:** `BaseController` — `OkResponse`, `FailResponse`, `NotFoundResponse`
- **Auth:** `POST /v1/api/Auth/login` → JWT header `Authorization: Bearer <token>`
- **Upload progress:** header `X-Ndjson-Upload-Progress: 1`, FE `apiUploadFormDataNdjson`

Lỗi BE: `KeyNotFoundException` → 404, `InvalidOperationException` → 400 (`ExceptionHandlingMiddleware`).

---

## Quy tắc code (luôn áp dụng)

1. Chỉ sửa file liên quan task — không refactor lan.
2. **Không commit** `.env`, `telegram.session`, secret.
3. Thêm/sửa API → **BE DTO + service + controller** và **FE types + service + hook**.
4. Controller **mỏng** — không business logic, không gọi DbContext trực tiếp (trừ pattern hiện có như `FolderService`).
5. Validator: `Application/Validators`, đăng ký DI tự động.
6. FE: không `fetch` thẳng trong page nếu đã có `services/*`.
7. Message hiển thị user: **tiếng Việt**.
8. Auth UI: class `ds-*` (`FE/src/app/globals.css`, [`FE/DESIGN.md`](FE/DESIGN.md)); admin: shadcn + token Tailwind (`bg-card`, `text-muted-foreground`).
9. Không commit trừ khi user yêu cầu.

---

## Thêm feature — thứ tự file

**Backend**

1. `Domain/Entities/` (+ DbContext nếu cần)
2. `Application/DTOs/`, `Interfaces/Services/`, `Validators/`
3. `Infrastructure/Services/` + đăng ký `DependencyInjection.cs`
4. `TelegramStorage/Controllers/` action `[Authorize]` khi cần
5. `dotnet ef migrations add ...` nếu đổi schema (`Infrastructure/Migrations/`)

**Frontend**

1. `src/types/`
2. `src/services/*-service.ts` (`BASE = "/v1/api/..."`)
3. `src/hooks/api/use-*.ts` + `queryKeys`, toast `ApiError`
4. Page/component trong `src/app/`

**Mẫu end-to-end:** Folders — `FoldersController`, `folder-service.ts`, `use-folders.ts`, `admin/folders/page.tsx`.

---

## Skill & tài liệu mở rộng

Đọc skill khi task chuyên sâu (trong `.cursor/skills/` hoặc `.agents/skills/`):

| Skill                       | Dùng khi                      |
| --------------------------- | ----------------------------- |
| `simple-web-backend`        | C#, controller, EF, validator |
| `simple-web-frontend`       | Next, hooks, services         |
| `simple-web-api-contract`   | Endpoint, đồng bộ types       |
| `simple-web-ef-migrations`  | Migration SQL Server          |
| `simple-web-ui`             | `ds-*`, shadcn, DESIGN.md     |
| `simple-web-telegram-cloud` | Upload, stream, Telegram      |

| Tài liệu                       | Nội dung                        |
| ------------------------------ | ------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)       | Bản đầy đủ, checklist, thư viện |
| [`FE/DESIGN.md`](FE/DESIGN.md) | Design tokens, class `ds-*`     |
| [`FE/AGENTS.md`](FE/AGENTS.md) | Cảnh báo Next.js 16             |
| [`DOCKER.md`](DOCKER.md)       | Container, env prod             |

---

## File nhớ nhanh

| Mục đích     | File                                               |
| ------------ | -------------------------------------------------- |
| API envelope | `BE/.../Common/Models/ApiResponse.cs`              |
| Route base   | `BE/TelegramStorage/Controllers/BaseController.cs` |
| FE HTTP      | `FE/src/lib/api-client.ts`                         |
| DI BE        | `BE/.../Infrastructure/DependencyInjection.cs`     |
| DbContext    | `BE/.../Data/TelegramStorageDbContext.cs`          |
