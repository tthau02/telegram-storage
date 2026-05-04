using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Data;

namespace TelegramStorage.Infrastructure.Data;

public static class RoleDataSeeder
{
    public static async Task SeedAsync(TelegramStorageDbContext db, ILogger? logger, CancellationToken cancellationToken = default)
    {
        if (await db.Roles.AnyAsync(cancellationToken))
        {
            return;
        }

        var createdAt = DateTimeOffset.UtcNow;
        db.Roles.AddRange(
            new Role
            {
                Name = "admin",
                DisplayName = "Quáº£n trá»‹ há»‡ thá»‘ng",
                IsStatic = true,
                CreatedAt = createdAt,
                IsDeleted = false,
            },
            new Role
            {
                Name = "staff",
                DisplayName = "NhÃ¢n viÃªn",
                IsStatic = false,
                CreatedAt = createdAt,
                IsDeleted = false,
            },
            new Role
            {
                Name = "customer",
                DisplayName = "KhÃ¡ch hÃ ng",
                IsStatic = false,
                CreatedAt = createdAt,
                IsDeleted = false,
            });
        await db.SaveChangesAsync(cancellationToken);
        logger?.LogInformation("Seeded 3 static roles: admin, staff, customer");
    }
}
