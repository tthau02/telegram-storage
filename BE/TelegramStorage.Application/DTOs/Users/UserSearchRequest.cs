using TelegramStorage.Application.Common.Models;

namespace TelegramStorage.Application.DTOs.Users;

/// <summary>
/// TÃ¬m kiáº¿m + phÃ¢n trang: username, fullname, tráº¡ng thÃ¡i tÃ i khoáº£n, theo role (Id hoáº·c tÃªn).
/// </summary>
public sealed class UserSearchRequest : PagedAndSortedRequest
{
    public string? UserName { get; init; }
    public string? FullName { get; init; }
    public bool? Status { get; init; }
    public long? RoleId { get; init; }
    public string? RoleName { get; init; }
}
