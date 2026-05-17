---
name: simple-web-ef-migrations
description: >-
  Creates and applies Entity Framework Core migrations for TelegramStorage SQL
  Server database. Use when changing entities, DbContext, schema, or database
  setup in BE/TelegramStorage.Infrastructure.
---

# EF Core Migrations

## Locations

- DbContext: `BE/TelegramStorage.Infrastructure/Data/TelegramStorageDbContext.cs`
- Migrations: `BE/TelegramStorage.Infrastructure/Migrations/`
- Startup host (design-time): `BE/TelegramStorage/`

## Create a migration

From `BE/`:

```bash
dotnet ef migrations add <MigrationName> \
  --project TelegramStorage.Infrastructure \
  --startup-project TelegramStorage
```

Use descriptive names: `AddFolderStarred`, `AlterCloudFileMimeType`.

## Apply

- **Automatic** on API start: `Program.cs` calls `db.Database.MigrateAsync()`.
- **Manual**:

```bash
dotnet ef database update \
  --project TelegramStorage.Infrastructure \
  --startup-project TelegramStorage
```

## Entity change checklist

1. Edit entity in `Domain/Entities/`.
2. Configure relationships in `OnModelCreating` if needed.
3. Add migration.
4. Review generated migration — avoid hand-edits unless you understand the impact.
5. Update DTOs/mapping/services if schema changed.

## Connection string

- Local/Docker: `ConnectionStrings:DefaultConnection` in appsettings or environment.
- Docker compose: see `BE/docker-compose.yml`.

## Do not

- Remove migrations already deployed to production without a rollback plan
- Commit real passwords in appsettings

## References

- `BE/TelegramStorage.Infrastructure/Migrations/`
- `BE/TelegramStorage/Program.cs` (MigrateAsync block)
