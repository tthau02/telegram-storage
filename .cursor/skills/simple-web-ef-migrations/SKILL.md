---
name: simple-web-ef-migrations
description: >-
  Creates and applies Entity Framework Core migrations for TelegramStorage SQL
  Server database. Use when changing entities, DbContext, schema, or database
  setup in BE/TelegramStorage.Infrastructure.
---

# EF Core Migrations

## Vị trí

- DbContext: `BE/TelegramStorage.Infrastructure/Data/TelegramStorageDbContext.cs`
- Migrations: `BE/TelegramStorage.Infrastructure/Migrations/`
- Startup host (design-time): `BE/TelegramStorage/`

## Tạo migration

Từ thư mục `BE/`:

```bash
dotnet ef migrations add <MigrationName> \
  --project TelegramStorage.Infrastructure \
  --startup-project TelegramStorage
```

Đặt tên mô tả: `AddFolderStarred`, `AlterCloudFileMimeType`.

## Áp dụng

- **Tự động** khi API chạy: `Program.cs` gọi `db.Database.MigrateAsync()`.
- **Thủ công**:

```bash
dotnet ef database update \
  --project TelegramStorage.Infrastructure \
  --startup-project TelegramStorage
```

## Entity changes checklist

1. Sửa entity trong `Domain/Entities/`.
2. Cấu hình relationship trong `OnModelCreating` nếu cần.
3. Tạo migration.
4. Review file migration generated — không sửa tay trừ khi hiểu rõ.
5. Cập nhật DTO/mapping/service nếu schema đổi.

## Connection string

- Local/Docker: `ConnectionStrings:DefaultConnection` trong appsettings hoặc env.
- Docker compose: xem `BE/docker-compose.yml`.

## Không làm

- Xóa migration đã deploy production mà không có kế hoạch rollback
- Commit password thật trong appsettings

## Tham chiếu

- `BE/TelegramStorage.Infrastructure/Migrations/`
- `BE/TelegramStorage/Program.cs` (MigrateAsync block)
