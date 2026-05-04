using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.Common.Paging;
using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Common.Query;
using TelegramStorage.Infrastructure.Data;

namespace TelegramStorage.Infrastructure.Repositories;

public class Repository<T> : IRepository<T>
    where T : BaseEntity
{
    private readonly DbSet<T> _set;

    public Repository(TelegramStorageDbContext context)
    {
        _set = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return await _set.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _set.ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<T>> GetPagedAsync(
        IPagedRequest request,
        IReadOnlyCollection<string>? allowedSortProperties = null,
        CancellationToken cancellationToken = default)
    {
        return await _set.AsQueryable().ToPagedResultAsync(
            request,
            allowedSortProperties,
            PagingDefaults.DefaultSortProperty,
            cancellationToken);
    }

    public IQueryable<T> Query() => _set.AsQueryable();

    public void Add(T entity) => _set.Add(entity);

    public void Update(T entity) => _set.Update(entity);

    public void Remove(T entity) => _set.Remove(entity);
}
