# BE — Claude / agent context

Đọc trước: [`../AGENTS.md`](../AGENTS.md) · Chi tiết: [`../CLAUDE.md`](../CLAUDE.md)

- Host: `TelegramStorage/` · Layer: Application → Domain ← Infrastructure
- Chạy: `dotnet run --project TelegramStorage` (từ `BE/`)
- API: `/v1/api/*`, envelope `ApiResponse<T>`, JWT `[Authorize]`
- Skill: `simple-web-backend`, `simple-web-ef-migrations`, `simple-web-telegram-cloud`
