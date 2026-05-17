---
name: simple-web-telegram-cloud
description: >-
  Implements Telegram-backed cloud storage in simple-web — WTelegramClient,
  file upload with NDJSON progress, streaming, mirror/yt-dlp, Telegram gateway
  login. Use when working on CloudStorage, TelegramGateway, upload dialogs, or
  media pull features.
---

# Telegram Cloud Storage

## Thành phần BE

| Thành phần | Vai trò |
|------------|---------|
| `TelegramMtProtoExecutor` | Singleton — gọi MTProto |
| `TelegramGatewayService` | Đăng nhập / session Telegram |
| `CloudStorageService` | Upload, list, stream file |
| `RemoteMediaPullService` | Mirror URL (HTTP client dài hạn) |
| `ThumbnailService` | Preview ảnh/video |
| `TelegramOptions` | Cấu hình trong appsettings |

Controllers:

- `CloudStorageController` — files, upload, stream
- `TelegramGatewayController` — liên kết tài khoản Telegram

## Upload + progress

1. FE gửi `FormData` qua `apiUploadFormDataNdjson`.
2. Header `X-Ndjson-Upload-Progress: 1`.
3. Response NDJSON: stages `telegram`, `complete`, `error`.
4. UI: `LoadProgress`, `mirror-upload-dialog.tsx`.

## Stream / xem file

- Admin: `stream-file-dialog.tsx` — mở viewer, token trên request.
- BE hỗ trợ HTTP Range (`HttpRangeHelper`).

## Session & bảo mật

- File `telegram.session` — **không commit**.
- Cấu hình API id/hash qua `TelegramOptions`.
- Lỗi WTelegram: middleware bắt `WTException` → 400 + message.

## FE pages liên quan

- `admin/cloud/page.tsx` — danh sách file cloud
- `admin/cloud/mirror-upload-dialog.tsx`
- `admin/folders/page.tsx` — file trong folder tree
- `services/cloud-storage-service.ts`, `telegram-gateway-service.ts`

## Khi sửa upload/stream

- Giữ đồng bộ header constant FE/BE.
- Test cả progress HTTP và phase `telegram`.
- Streaming: đừng ghi error body sau khi response đã start (middleware đã xử lý).

## Docker / FFmpeg

- `Xabe.FFmpeg` cho xử lý media; kiểm tra path ffmpeg trong container nếu deploy.

## Tham chiếu

- `BE/TelegramStorage/Controllers/CloudStorageController.cs`
- `FE/src/lib/api-client.ts` (`apiUploadFormDataNdjson`)
- `FE/src/services/cloud-storage-service.ts`
