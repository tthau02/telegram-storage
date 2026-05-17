---
name: simple-web-api-contract
description: >-
  Aligns frontend and backend API contracts for simple-web — ApiResponse
  envelope, v1/api routes, JWT, camelCase JSON, error handling. Use when adding
  endpoints, changing DTOs, or debugging FE/BE integration.
---

# API Contract — FE ↔ BE

## URL

| Thành phần | Giá trị |
|------------|---------|
| Prefix | `/v1/api` |
| Controller | Tên class bỏ hậu tố `Controller` (`Folders` → `/v1/api/Folders`) |
| Dev API | `http://localhost:8080` (hoặc `NEXT_PUBLIC_API_URL`) |

## Response envelope

Mọi JSON business response dùng `ApiResponse<T>`:

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

`apiFetch` trả về **`data`** khi `success === true`; ném `ApiError` khi không.

## HTTP status vs envelope

- Middleware có thể trả body envelope với HTTP 404/400/500.
- FE đọc `message`, `errors[]`, `statusCode` từ envelope khi parse JSON.

## Auth flow

1. `POST /v1/api/Auth/login` body `{ login, password }`.
2. Lưu token (FE: `auth-storage`).
3. Gọi API: `apiFetch(path, { token })` → header `Authorization: Bearer ...`.

## Thêm endpoint mới

1. **BE**: DTO trong `Application/DTOs/`, action trên controller, service method.
2. **FE**: type → service method → hook → UI.
3. Đặt tên property **camelCase** trên wire (BE serialize camelCase).

## Upload đặc biệt

- Cloud upload + progress: `apiUploadFormDataNdjson`.
- Header: `X-Ndjson-Upload-Progress: 1`.
- Stream file: range requests — xem `CloudStorageController`, `stream-file-dialog.tsx`.

## Kiểm tra nhanh

- Swagger dev: `/swagger`
- So khớp path FE `BASE` với route attribute BE

## Tham chiếu

- `BE/TelegramStorage/Controllers/BaseController.cs`
- `BE/TelegramStorage.Application/Common/Models/ApiResponse.cs`
- `FE/src/lib/api-client.ts`
