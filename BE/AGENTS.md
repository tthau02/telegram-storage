# BE — Agent notes

Đọc trước: [`../AGENTS.md`](../AGENTS.md) · Chi tiết: [`../CLAUDE.md`](../CLAUDE.md)

- Clean Architecture: `TelegramStorage` (API) → `Application` → `Domain` ← `Infrastructure`
- Chạy: `dotnet run --project TelegramStorage` (từ `BE/`)
- Route: `v1/api/[controller]`, response `ApiResponse<T>`, lỗi qua `ExceptionHandlingMiddleware`
- Migration: `dotnet ef migrations add ... --project TelegramStorage.Infrastructure --startup-project TelegramStorage`
