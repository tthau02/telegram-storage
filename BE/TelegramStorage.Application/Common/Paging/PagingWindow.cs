namespace TelegramStorage.Application.Common.Paging;

/// <summary>GiÃ¡ trá»‹ chuáº©n hÃ³a tá»« <see cref="Models.PagedAndSortedRequest"/> (page, skip, take).</summary>
public readonly record struct PagingWindow(int Page, int PageSize, int Skip)
{
    public int Take => PageSize;
}
