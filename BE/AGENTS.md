# BE — Agent notes

Read first: [`../AGENTS.md`](../AGENTS.md) · Detail: [`../CLAUDE.md`](../CLAUDE.md)

- Clean Architecture: `TelegramStorage` (API) → `Application` → `Domain` ← `Infrastructure`
- Run: `dotnet run --project TelegramStorage` (from `BE/`)
- Routes: `v1/api/[controller]`, responses `ApiResponse<T>`, errors via `ExceptionHandlingMiddleware`
- Migrations: `dotnet ef migrations add ... --project TelegramStorage.Infrastructure --startup-project TelegramStorage`
