# Simple Web (TelegramStorage) — Hướng dẫn cho AI Agent

> Onboarding nhanh cho mọi agent: [`AGENTS.md`](AGENTS.md). File này là bản chi tiết.

Monorepo lưu trữ đám mây qua Telegram: **BE** (.NET 8) + **FE** (Next.js 16 / React 19). UI tiếng Việt, API envelope thống nhất.

## Tổng quan dự án

| Thành phần | Mô tả |
|------------|--------|
| **BE** | API ASP.NET Core, SQL Server, JWT, upload/stream file qua Telegram (WTelegramClient) |
| **FE** | Admin + auth + client; gọi API qua `apiFetch`, React Query, Redux (theme/UI) |
| **Docker** | `BE/docker-compose.yml` — SQL Server + API; FE dev `:3000`, API `:8080` |

Đọc thêm: [DOCKER.md](DOCKER.md), thiết kế UI [FE/DESIGN.md](FE/DESIGN.md), Next.js [FE/AGENTS.md](FE/AGENTS.md).

---

## Thư viện chính

### Backend (`BE/`)

| Package | Vai trò |
|---------|---------|
| **.NET 8** | Runtime |
| **EF Core 8 + SQL Server** | ORM, migrations |
| **FluentValidation** | Validate request (auto-validation) |
| **AutoMapper** | Entity ↔ DTO |
| **JWT Bearer** | Xác thực API |
| **Swashbuckle** | Swagger (Development) |
| **WTelegramClient** | MTProto Telegram |
| **SixLabors.ImageSharp** | Thumbnail |
| **Xabe.FFmpeg** | Xử lý media (mirror/yt-dlp) |
| **ASP.NET Identity PasswordHasher** | Hash mật khẩu user |

### Frontend (`FE/`)

| Package | Vai trò |
|---------|---------|
| **Next.js 16.2** | App Router — **đọc `node_modules/next/dist/docs/` trước khi code** (API khác bản cũ) |
| **React 19** | UI |
| **TypeScript 5** | strict mode |
| **Tailwind CSS 4** | Styling + `@layer components` (`ds-*`) |
| **shadcn / Radix / Base UI** | Component primitives (`src/components/ui/`) |
| **TanStack React Query 5** | Server state, cache, mutations |
| **Redux Toolkit** | Theme, UI slice |
| **lucide-react** | Icons |
| **sonner** | Toast |
| **date-fns, react-day-picker** | Ngày tháng |
| **class-variance-authority, clsx, tailwind-merge** | Class utilities (`cn()` trong `lib/utils.ts`) |

---

## Cấu trúc source code

```
simple-web/
├── AGENTS.md                 # Onboarding ngắn (mọi AI agent)
├── CLAUDE.md                 # File này (chi tiết)
├── DOCKER.md
├── BE/
│   ├── TelegramStorage/              # Web host: Controllers, Program.cs, Middleware
│   ├── TelegramStorage.Application/  # DTOs, Interfaces, Validators, AutoMapper, Options
│   ├── TelegramStorage.Domain/       # Entities (BaseEntity, Folder, CloudFile, User…)
│   ├── TelegramStorage.Infrastructure/ # EF DbContext, Repositories, Services, Migrations
│   └── docker-compose.yml
└── FE/
    ├── AGENTS.md             # Cảnh báo Next.js 16
    ├── DESIGN.md             # Design tokens + ds-* classes
    └── src/
        ├── app/              # Route groups: (auth), (admin), (client)
        ├── components/       # ui/ (shadcn), admin/, client/, shared/
        ├── config/           # routes, admin-nav, branding
        ├── constants/
        ├── hooks/api/        # React Query hooks + query keys
        ├── lib/              # api-client, auth-storage, utils, toast
        ├── providers/        # Query, Redux, theme
        ├── services/         # Gọi API (1 service / resource)
        ├── store/            # Redux slices
        └── types/            # TypeScript DTOs khớp BE
```

### Luồng phụ thuộc BE (Clean Architecture)

```
Controller → I*Service (Application) → Implementation (Infrastructure) → DbContext / Telegram
                ↑
         FluentValidator, AutoMapper
```

- **Domain**: chỉ entity, không reference layer khác.
- **Application**: contract + DTO + validator; không reference Infrastructure.
- **Infrastructure**: EF, Telegram, implement service.
- **TelegramStorage (API)**: thin controllers, middleware, DI wiring.

### Luồng FE

```
page.tsx → hooks/api (useQuery/useMutation) → services/* → apiFetch → BE /v1/api/...
```

- Token JWT: lấy từ `auth-storage`, truyền `token` vào service/hook.
- Không gọi `fetch` trực tiếp trong page nếu đã có service.

---

## Quy ước API (FE ↔ BE)

### Route prefix

Tất cả controller kế thừa `BaseController`:

```csharp
[Route("v1/api/[controller]")]
```

Ví dụ: `FoldersController` → `/v1/api/Folders/tree`.

### Envelope JSON (camelCase)

```json
{
  "success": true,
  "message": "...",
  "data": { },
  "errors": ["..."],
  "statusCode": 200
}
```

- FE: `apiFetch` trong `FE/src/lib/api-client.ts` unwrap `data`, ném `ApiError` khi `success === false`.
- BE: `OkResponse`, `FailResponse`, `NotFoundResponse` trên `BaseController`.

### Auth

- Login: `POST /v1/api/Auth/login` → JWT.
- Header: `Authorization: Bearer <token>`.
- Controller protected: `[Authorize]`.

### Upload có tiến độ Telegram

- Header: `X-Ndjson-Upload-Progress: 1` (hằng `NDJSON_UPLOAD_PROGRESS_HEADER` ở FE).
- FE dùng `apiUploadFormDataNdjson` (XHR + NDJSON stream).

---

## Format & style code

### Backend (C#)

- `Nullable enable`, file-scoped namespace khi phù hợp.
- Controller: **không** business logic; chỉ map request → service → `ApiResponse`.
- Service mới CRUD: cân nhắc kế thừa `AppServiceBase` + `IUnitOfWork` / `Repo<T>()`.
- Validation: `AbstractValidator<T>` trong `Application/Validators`, đăng ký qua `AddValidatorsFromAssembly`.
- Lỗi nghiệp vụ: `KeyNotFoundException` (404), `InvalidOperationException` (400) — `ExceptionHandlingMiddleware` map sang envelope.
- Message user-facing: **tiếng Việt** (đồng bộ FE toast).
- Migration: thêm vào `TelegramStorage.Infrastructure/Migrations`, chạy tự động khi API start (`MigrateAsync`).

### Frontend (TypeScript / React)

- `"use client"` chỉ khi cần hooks/events; layout/page server khi có thể.
- Import alias: `@/` → `src/`.
- **Services**: object `const xxxService = { ... }`, path `BASE = "/v1/api/..."`.
- **Hooks**: `useXxxQuery` / `useXxxMutation` trong `hooks/api/`, `queryKeys` tách file hoặc cùng module.
- **Types**: mirror DTO BE trong `src/types/`.
- UI: ưu tiên component `components/ui/*`; class design system `ds-*` từ `globals.css` (xem DESIGN.md §10).
- Tailwind: semantic tokens (`bg-card`, `text-muted-foreground`), tránh hex lẻ trừ khi đã có token.
- Lỗi API: `instanceof ApiError` + `sonner` toast (pattern trong `use-folders.ts`).

### ESLint

```bash
cd FE && npm run lint
```

Dùng `eslint-config-next` (core-web-vitals + typescript).

---

## Rules dự án (bắt buộc)

1. **Phạm vi thay đổi**: Chỉ sửa code liên quan task; không refactor lan man.
2. **Không commit secret**: `.env`, `telegram.session`, connection string production.
3. **Không commit** trừ khi user yêu cầu rõ.
4. **API contract**: Thêm field BE → cập nhật `types/` + `services/` + hooks FE.
5. **Next.js 16**: Không giả định API Pages Router cũ; đọc docs trong `node_modules/next/dist/docs/`.
6. **CORS**: BE cấu hình `Cors:AllowedOrigins`; dev mặc định `localhost:3000`.
7. **Ngôn ngữ UI**: Tiếng Việt cho label, toast, message lỗi hiển thị user.
8. **Design**: Panel auth / marketing dùng `ds-*`; admin dùng shadcn + Tailwind semantic.
9. **Telegram session**: File session nhạy cảm — không đưa vào git.
10. **Docker prod**: `NEXT_PUBLIC_API_URL` = URL public API khi build image FE.

---

## Chạy local

```bash
# BE (từ BE/ hoặc docker compose)
dotnet run --project TelegramStorage

# FE
cd FE && npm install && npm run dev
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8080
```

Swagger (Development): `http://localhost:8080/swagger`.

---

## Skills trong repo (`.cursor/skills/`)

Agent nên đọc skill phù hợp khi làm task chuyên biệt:

| Skill | Khi dùng |
|-------|----------|
| `simple-web-backend` | Controller, service, EF, validator |
| `simple-web-frontend` | Page, hook, service, Next.js 16 |
| `simple-web-api-contract` | Thêm/sửa endpoint, đồng bộ FE types |
| `simple-web-ef-migrations` | Schema DB, migration |
| `simple-web-ui` | Component, `ds-*`, DESIGN.md |
| `simple-web-telegram-cloud` | Upload, stream, Telegram gateway |

---

## Checklist feature mới

**BE**

- [ ] Entity / cập nhật DbContext
- [ ] DTO + interface `I*Service` (Application)
- [ ] Validator (nếu có body)
- [ ] Implementation (Infrastructure) + đăng ký DI
- [ ] Controller action + `[Authorize]` nếu cần
- [ ] Migration nếu đổi schema

**FE**

- [ ] `types/*.ts`
- [ ] `services/*-service.ts`
- [ ] `hooks/api/use-*.ts` + query keys
- [ ] UI page/component
- [ ] Toast / loading / error states

---

## Tài liệu tham chiếu nhanh

- Envelope BE: `TelegramStorage.Application/Common/Models/ApiResponse.cs`
- Base controller: `BE/TelegramStorage/Controllers/BaseController.cs`
- API client FE: `FE/src/lib/api-client.ts`
- Ví dụ end-to-end: Folders — `FoldersController`, `folder-service.ts`, `use-folders.ts`, `admin/folders/page.tsx`
