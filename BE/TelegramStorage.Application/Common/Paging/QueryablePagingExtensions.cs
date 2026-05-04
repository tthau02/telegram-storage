namespace TelegramStorage.Application.Common.Paging;

/// <summary>PhÃ¢n trang táº­p trung â€” service chá»‰ cáº§n <c>query.ApplyPaging(window)</c>.</summary>
public static class QueryablePagingExtensions
{
    public static IQueryable<T> ApplyPaging<T>(this IQueryable<T> query, in PagingWindow window) =>
        query
            .Skip(window.Skip)
            .Take(window.Take);
}
