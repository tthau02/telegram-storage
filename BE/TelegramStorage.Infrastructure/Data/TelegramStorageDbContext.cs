using Microsoft.EntityFrameworkCore;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Data.Configurations;

namespace TelegramStorage.Infrastructure.Data;

public class TelegramStorageDbContext : DbContext
{
    public TelegramStorageDbContext(DbContextOptions<TelegramStorageDbContext> options)
        : base(options)
    {
    }
    public virtual DbSet<User> Users { get; set; } = default!;
    public virtual DbSet<Role> Roles { get; set; } = default!;
    public virtual DbSet<UserRole> UserRoles { get; set; } = default!;
    public virtual DbSet<Permission> Permissions { get; set; } = default!;
    public virtual DbSet<PermissionGrant> PermissionGrants { get; set; } = default!;
    public virtual DbSet<CloudFile> CloudFiles { get; set; } = default!;
    public virtual DbSet<TrafficLog> TrafficLogs { get; set; } = default!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Má»i entity : BaseEntity: Id, CreatedAt, audit â€” khÃ´ng cáº§n file IEntityTypeConfiguration/entity
        modelBuilder.ApplyBaseEntityConventions();
        // Bá»• sung fluent cho tá»«ng nhÃ³m báº£ng (cÃ³ thá»ƒ tÃ¡ch nhiá»u extension khi dá»± Ã¡n lá»›n)
        modelBuilder.ConfigureUserRoleModel();
        modelBuilder.ConfigureCloudStorage();
        base.OnModelCreating(modelBuilder);
    }
}