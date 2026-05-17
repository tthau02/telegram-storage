# BE — Claude / agent context

Read first: [`../AGENTS.md`](../AGENTS.md) · Detail: [`../CLAUDE.md`](../CLAUDE.md)

- Host: `TelegramStorage/` · Layers: Application → Domain ← Infrastructure
- Run: `dotnet run --project TelegramStorage` (from `BE/`)
- API: `/v1/api/*`, envelope `ApiResponse<T>`, JWT `[Authorize]`
- Skills: `simple-web-backend`, `simple-web-ef-migrations`, `simple-web-telegram-cloud`
