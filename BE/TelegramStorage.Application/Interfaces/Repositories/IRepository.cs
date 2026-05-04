using TelegramStorage.Application.Common.Models;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Interfaces.Repositories;

public interface IRepository<T>
    where T : BaseEntity
{
    Task<T?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<PagedResult<T>> GetPagedAsync(
        IPagedRequest request,
        IReadOnlyCollection<string>? allowedSortProperties = null,
        CancellationToken cancellationToken = default);

    IQueryable<T> Query();

    void Add(T entity);

    void Update(T entity);

    void Remove(T entity);
}
