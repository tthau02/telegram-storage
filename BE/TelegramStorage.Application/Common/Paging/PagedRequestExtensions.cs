using TelegramStorage.Application.Common.Models;

namespace TelegramStorage.Application.Common.Paging;

public static class PagedRequestExtensions
{
    public static PagingWindow ToPagingWindow(this IPagedRequest request)
    {
        var page = Math.Max(PagedAndSortedRequest.DefaultPage, request.Page);
        var pageSize = request.PageSize <= 0
            ? PagedAndSortedRequest.DefaultPageSize
            : Math.Clamp(request.PageSize, 1, PagedAndSortedRequest.MaxPageSize);
        var skip = (page - 1) * pageSize;
        return new PagingWindow(page, pageSize, skip);
    }
}
