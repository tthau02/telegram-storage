using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Queryable;

/// <summary>
/// Lá»c entity chÆ°a xÃ³a má»m â€” dÃ¹ng chung má»i module (User, Productâ€¦).
/// </summary>
public static class BaseEntityQueryableExtensions
{
    public static IQueryable<T> WhereNotDeleted<T>(this IQueryable<T> source)
        where T : BaseEntity =>
        source.Where(e => !e.IsDeleted);
}
