---
name: simple-web-telegram-cloud
description: >-
  Implements Telegram-backed cloud storage in simple-web — WTelegramClient,
  file upload with NDJSON progress, streaming, mirror/yt-dlp, Telegram gateway
  login. Use when working on CloudStorage, TelegramGateway, upload dialogs, or
  media pull features.
---

# Telegram Cloud Storage

## BE components

| Component | Role |
|-----------|------|
| `TelegramMtProtoExecutor` | Singleton — MTProto calls |
| `TelegramGatewayService` | Telegram login / session |
| `CloudStorageService` | Upload, list, stream files |
| `RemoteMediaPullService` | Mirror URL (long-running HTTP client) |
| `ThumbnailService` | Image/video previews |
| `TelegramOptions` | appsettings configuration |

Controllers:

- `CloudStorageController` — files, upload, stream
- `TelegramGatewayController` — link Telegram account

## Upload + progress

1. FE sends `FormData` via `apiUploadFormDataNdjson`.
2. Header `X-Ndjson-Upload-Progress: 1`.
3. NDJSON response stages: `telegram`, `complete`, `error`.
4. UI: `LoadProgress`, `mirror-upload-dialog.tsx`.

## Stream / view file

- Admin: `stream-file-dialog.tsx` — viewer, token on request.
- BE supports HTTP Range (`HttpRangeHelper`).

## Session & security

- `telegram.session` file — **never commit**.
- API id/hash via `TelegramOptions`.
- WTelegram errors: middleware catches `WTException` → 400 + message.

## Related FE pages

- `admin/cloud/page.tsx` — cloud file list
- `admin/cloud/mirror-upload-dialog.tsx`
- `admin/folders/page.tsx` — files in folder tree
- `services/cloud-storage-service.ts`, `telegram-gateway-service.ts`

## When changing upload/stream

- Keep FE/BE header constants in sync.
- Test both HTTP upload progress and `telegram` phase.
- Streaming: do not write error body after the response has started (middleware handles this).

## Docker / FFmpeg

- `Xabe.FFmpeg` for media; verify ffmpeg path in container when deploying.

## References

- `BE/TelegramStorage/Controllers/CloudStorageController.cs`
- `FE/src/lib/api-client.ts` (`apiUploadFormDataNdjson`)
- `FE/src/services/cloud-storage-service.ts`
