using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Data;

namespace TelegramStorage.Infrastructure.Services;

public sealed class FolderService : IFolderService
{
    private readonly TelegramStorageDbContext _db;

    public FolderService(TelegramStorageDbContext db)
    {
        _db = db;
    }

    public async Task<List<FolderDto>> GetTreeAsync(long? userId, CancellationToken cancellationToken = default)
    {
        var query = _db.Set<Folder>()
            .Where(f => !f.IsDeleted && !f.IsTrashed)
            .AsNoTracking();

        if (userId.HasValue)
        {
            var isAdmin = _db.UserRoles.Any(ur => ur.UserId == userId.Value && _db.Roles.Any(r => r.Id == ur.RoleId && r.IsStatic));
            if (!isAdmin)
                query = query.Where(f => f.OwnerId == userId.Value);
        }

        var folders = await query
            .Include(f => f.Children.Where(c => !c.IsDeleted && !c.IsTrashed))
            .Include(f => f.Files)
            .ToListAsync(cancellationToken);

        return folders.Select(MapToDto).ToList();
    }

    public async Task<FolderDto> CreateAsync(CreateFolderRequest request, long userId, CancellationToken cancellationToken = default)
    {
        var entity = new Folder
        {
            Name = request.Name.Trim(),
            OwnerId = userId,
            ParentId = request.ParentId,
            IsDeleted = false,
            IsTrashed = false,
        };

        if (request.ParentId.HasValue)
        {
            var parent = await _db.Set<Folder>()
                .FirstOrDefaultAsync(f => f.Id == request.ParentId.Value && !f.IsDeleted, cancellationToken);
            if (parent is null)
                throw new KeyNotFoundException("Thư mục cha không tồn tại.");
        }

        _db.Set<Folder>().Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return MapToDto(entity);
    }

    public async Task<FolderDto> RenameAsync(long id, RenameFolderRequest request, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Set<Folder>()
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted, cancellationToken);
        if (entity is null)
            throw new KeyNotFoundException("Không tìm thấy thư mục.");

        entity.Name = request.Name.Trim();
        await _db.SaveChangesAsync(cancellationToken);
        return MapToDto(entity);
    }

    public async Task DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Set<Folder>()
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted, cancellationToken);
        if (entity is null)
            throw new KeyNotFoundException("Không tìm thấy thư mục.");

        entity.IsDeleted = true;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static FolderDto MapToDto(Folder f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        OwnerId = f.OwnerId,
        ParentId = f.ParentId,
        IsStarred = f.IsStarred,
        CreatedAt = f.CreatedAt,
        FileCount = f.Files?.Count ?? 0,
        ChildrenCount = f.Children?.Count ?? 0,
    };
}
