---
name: simple-web-api-contract
description: >-
  Aligns frontend and backend API contracts for simple-web — ApiResponse
  envelope, v1/api routes, JWT, camelCase JSON, error handling. Use when adding
  endpoints, changing DTOs, or debugging FE/BE integration.
---

# API Contract — FE ↔ BE

## URL

| Part | Value |
|------|-------|
| Prefix | `/v1/api` |
| Controller | Class name without `Controller` suffix (`Folders` → `/v1/api/Folders`) |
| Dev API | `http://localhost:8080` (or `NEXT_PUBLIC_API_URL`) |

## Response envelope

All JSON business responses use `ApiResponse<T>`:

```typescript
// FE — api-client.ts
type ApiEnvelope<T> = {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
  statusCode: number;
};
```

`apiFetch` returns **`data`** when `success === true`; throws `ApiError` otherwise.

## HTTP status vs envelope

- Middleware may return an envelope body with HTTP 404/400/500.
- FE reads `message`, `errors[]`, `statusCode` from the envelope when parsing JSON.

## Auth flow

1. `POST /v1/api/Auth/login` body `{ login, password }`.
2. Store token (FE: `auth-storage`).
3. Call APIs: `apiFetch(path, { token })` → header `Authorization: Bearer ...`.

## Adding a new endpoint

1. **BE**: DTO in `Application/DTOs/`, controller action, service method.
2. **FE**: type → service method → hook → UI.
3. Wire properties in **camelCase** (BE serializes camelCase).

## Special: upload

- Cloud upload + progress: `apiUploadFormDataNdjson`.
- Header: `X-Ndjson-Upload-Progress: 1`.
- File stream: HTTP Range — see `CloudStorageController`, `stream-file-dialog.tsx`.

## Quick verification

- Swagger dev: `/swagger`
- FE service `BASE` must match BE route attributes

## References

- `BE/TelegramStorage/Controllers/BaseController.cs`
- `BE/TelegramStorage.Application/Common/Models/ApiResponse.cs`
- `FE/src/lib/api-client.ts`
