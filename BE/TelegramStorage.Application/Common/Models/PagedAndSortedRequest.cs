namespace TelegramStorage.Application.Common.Models;

/// <summary>
/// PhÃ¢n trang + sáº¯p xáº¿p dÃ¹ng chung â€” DTO tÃ¬m kiáº¿m/ danh sÃ¡ch káº¿ thá»«a, khÃ´ng cáº§n láº·p thuá»™c tÃ­nh.
/// </summary>
public abstract class PagedAndSortedRequest : IPagedRequest
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 500;

    public int Page { get; init; } = DefaultPage;
    public int PageSize { get; init; } = DefaultPageSize;
    public string? SortBy { get; init; }
    public bool IsDesc { get; init; }
}
