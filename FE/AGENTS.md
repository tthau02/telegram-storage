# FE — Agent notes

Read first: [`../AGENTS.md`](../AGENTS.md) (whole repo) · Detail: [`../CLAUDE.md`](../CLAUDE.md) · UI: [`DESIGN.md`](DESIGN.md)

## Next.js 16 (required)

APIs and conventions **differ from Next 14/15**. Before writing or editing FE code, read guides in:

`FE/node_modules/next/dist/docs/`

Do not assume Pages Router or older APIs from training data.

## FE cheat sheet

- Alias `@/` → `src/`
- Flow: `app/*` → `hooks/api` → `services` → `lib/api-client.ts`
- Env: `NEXT_PUBLIC_API_URL=http://localhost:8080` (`.env.local`)
- Lint: `npm run lint` (from `FE/`)
