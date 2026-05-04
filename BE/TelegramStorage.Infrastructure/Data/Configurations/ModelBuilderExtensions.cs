using Microsoft.EntityFrameworkCore;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Infrastructure.Data.Configurations;

/// <summary>
/// Convention táº­p trung: má»i class káº¿ thá»«a <see cref="BaseEntity"/> (Ä‘Ã£ Ä‘Äƒng kÃ½ DbSet trong <see cref="TelegramStorageDbContext"/>)
/// tá»± Ã¡p cáº¥u hÃ¬nh chung. Entity má»›i: khai bÃ¡o thuá»™c tÃ­nh + thÃªm DbSet; bá»• sung fluent táº¡i
/// <see cref="ConfigureUserRoleModel"/> (hoáº·c tÃ¡ch method má»›i) náº¿u cáº§n tÃªn báº£ng, Ä‘á»™ dÃ i, unique, quan há»‡.
/// </summary>
public static class ModelBuilderExtensions
{
    public static void ApplyBaseEntityConventions(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (entityType.IsOwned() || entityType.IsKeyless)
                continue;

            var clr = entityType.ClrType;
            if (clr is null || !typeof(BaseEntity).IsAssignableFrom(clr) || clr.IsAbstract)
                continue;

            modelBuilder.Entity(clr, b =>
            {
                b.HasKey(nameof(BaseEntity.Id));
                b.Property<long>(nameof(BaseEntity.Id))
                    .ValueGeneratedOnAdd()
                    .UseIdentityColumn();
                b.Property(nameof(BaseEntity.CreatedAt)).IsRequired();
                b.Property(nameof(BaseEntity.CreatedBy)).HasMaxLength(256);
                b.Property(nameof(BaseEntity.UpdatedBy)).HasMaxLength(256);
                b.Property(nameof(BaseEntity.IsDeleted)).IsRequired();
            });
        }
    }

    public static void ConfigureUserRoleModel(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("Users");
            b.Property(e => e.UserName).IsRequired().HasMaxLength(256);
            b.Property(e => e.FullName).IsRequired().HasMaxLength(256);
            b.Property(e => e.Email).IsRequired().HasMaxLength(256);
            b.Property(e => e.PasswordHash).IsRequired().HasMaxLength(500);
            b.Property(e => e.PhoneNumber).HasMaxLength(32);
            b.Property(e => e.Avatar).HasMaxLength(2000);
            b.Property(e => e.Status).IsRequired();
            b.HasIndex(e => e.UserName).IsUnique();
            b.HasIndex(e => e.Email).IsUnique();
            b.HasIndex(e => e.IsDeleted);
        });

        modelBuilder.Entity<Role>(b =>
        {
            b.ToTable("Roles");
            b.Property(e => e.Name).IsRequired().HasMaxLength(128);
            b.Property(e => e.DisplayName).HasMaxLength(256);
            b.Property(e => e.IsStatic).IsRequired();
            b.HasIndex(e => e.Name).IsUnique();
            b.HasIndex(e => e.IsDeleted);
        });

        modelBuilder.Entity<UserRole>(b =>
        {
            b.ToTable("UserRoles");
            b.Property(e => e.UserId).IsRequired();
            b.Property(e => e.RoleId).IsRequired();
            b.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_UserRoles_Users_UserId");
            b.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_UserRoles_Roles_RoleId");
            b.HasIndex(e => e.UserId);
            b.HasIndex(e => e.RoleId);
            b.HasIndex(e => new { e.UserId, e.RoleId }).IsUnique();
            b.HasIndex(e => e.IsDeleted);
        });
    }

    public static void ConfigureCloudStorage(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CloudFile>(b =>
        {
            b.ToTable("Files");
            b.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            b.Property(e => e.TelegramMessageId).IsRequired();
            b.Property(e => e.FileHash).IsRequired().HasMaxLength(100);
            b.Property(e => e.FileSize).IsRequired();
            b.Property(e => e.MimeType).IsRequired().HasMaxLength(100);
            b.Property(e => e.ThumbnailUrl).HasColumnType("nvarchar(max)");
            b.HasIndex(e => e.TelegramMessageId);
            b.HasIndex(e => e.FileHash)
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
            b.HasIndex(e => e.IsDeleted);
        });

        modelBuilder.Entity<TrafficLog>(b =>
        {
            b.ToTable("TrafficLogs");
            b.Property(e => e.Action).IsRequired().HasMaxLength(64);
            b.Property(e => e.SourceUrl).HasColumnType("nvarchar(max)");
            b.HasIndex(e => e.UserId);
            b.HasIndex(e => e.CreatedAt);
            b.HasIndex(e => e.CloudFileId);
            b.HasOne(e => e.CloudFile)
                .WithMany()
                .HasForeignKey(e => e.CloudFileId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
