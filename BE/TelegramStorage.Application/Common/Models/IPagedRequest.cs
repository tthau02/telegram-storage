namespace TelegramStorage.Application.Common.Models;

/// <summary>Há»£p Ä‘á»“ng request phÃ¢n trang â€” dÃ¹ng lÃ m generic constraint (class sealed khÃ´ng dÃ¹ng Ä‘Æ°á»£c lÃ m constraint).</summary>
public interface IPagedRequest
{
    int Page { get; }

    int PageSize { get; }

    string? SortBy { get; }

    bool IsDesc { get; }
}
