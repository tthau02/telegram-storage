using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.Common.Paging;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Infrastructure.Common.Query;

/// <summary>
/// PhÃ¢n trang + sort EF cho báº¥t ká»³ <see cref="IQueryable{T}"/> (má»™t chá»— dÃ¹ng cho repository &amp; app service).
/// </summary>
public static class EfPagedQueryableExtensions
{
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> source,
        IPagedRequest request,
        IReadOnlyCollection<string>? allowedSortProperties,
        string defaultSortPropertyName,
        CancellationToken cancellationToken = default)
        where T : BaseEntity
    {
        var window = request.ToPagingWindow();
        var sortField = PagedSortResolver.ResolveSortPropertyName<T>(
            request,
            allowedSortProperties,
            defaultSortPropertyName);
        var totalCount = await source.CountAsync(cancellationToken);
        var items = await source
            .OrderByEfProperty(sortField, request.IsDesc)
            .ApplyPaging(window)
            .ToListAsync(cancellationToken);

        return new PagedResult<T>
        {
            Items = items,
            Page = window.Page,
            PageSize = window.PageSize,
            TotalCount = totalCount,
            SortedBy = sortField,
            IsDesc = request.IsDesc,
        };
    }
}
