using Microsoft.EntityFrameworkCore;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Infrastructure.Common.Query;

/// <summary>
/// Sáº¯p xáº¿p theo tÃªn thuá»™c tÃ­nh (EF.Property) + ThenBy(Id) á»•n Ä‘á»‹nh â€” dÃ¹ng chung cho EF.
/// </summary>
public static class EfQueryableOrderExtensions
{
    public static IQueryable<T> OrderByEfProperty<T>(
        this IQueryable<T> source,
        string propertyName,
        bool descending)
        where T : BaseEntity
    {
        if (descending)
        {
            return source
                .OrderByDescending(e => EF.Property<object>(e, propertyName))
                .ThenBy(e => e.Id);
        }

        return source
            .OrderBy(e => EF.Property<object>(e, propertyName))
            .ThenBy(e => e.Id);
    }
}
