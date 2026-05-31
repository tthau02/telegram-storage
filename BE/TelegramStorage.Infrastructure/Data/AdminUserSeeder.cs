using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Infrastructure.Data;

public static class AdminUserSeeder
{
    public static async Task SeedAsync(
        TelegramStorageDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger? logger,
        CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        var createdAt = DateTimeOffset.UtcNow;
        var adminUser = new User
        {
            UserName = "admin",
            FullName = "Quản trị viên",
            Email = "admin@gmail.com",
            Status = true,
            CreatedAt = createdAt,
            IsDeleted = false,
        };

        adminUser.PasswordHash = passwordHasher.HashPassword(adminUser, "123qwe");

        db.Users.Add(adminUser);
        await db.SaveChangesAsync(cancellationToken);

        db.UserRoles.Add(new UserRole
        {
            UserId = adminUser.Id,
            RoleId = 1,
            CreatedAt = createdAt,
            IsDeleted = false,
        });
        await db.SaveChangesAsync(cancellationToken);

        logger?.LogInformation("Seeded default admin user: admin / 123qwe");
    }
}
