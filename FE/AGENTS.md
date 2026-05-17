# FE — Agent notes

Đọc trước: [`../AGENTS.md`](../AGENTS.md) (toàn repo) · Chi tiết: [`../CLAUDE.md`](../CLAUDE.md) · UI: [`DESIGN.md`](DESIGN.md)

## Next.js 16 (bắt buộc)

API và convention **khác Next 14/15**. Trước khi viết/sửa code FE, đọc guide trong:

`FE/node_modules/next/dist/docs/`

Không giả định Pages Router hay API cũ từ training data.

## FE nhanh

- Alias `@/` → `src/`
- Luồng: `app/*` → `hooks/api` → `services` → `lib/api-client.ts`
- Env: `NEXT_PUBLIC_API_URL=http://localhost:8080` (`.env.local`)
- Lint: `npm run lint` (trong `FE/`)
