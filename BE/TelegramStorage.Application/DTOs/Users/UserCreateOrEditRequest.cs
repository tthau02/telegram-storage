namespace TelegramStorage.Application.DTOs.Users;

/// <summary>
/// Form quáº£n trá»‹: táº¡o hoáº·c sá»­a user. Create dÃ¹ng RuleSet <c>Create</c>, cáº­p nháº­t dÃ¹ng <c>Update</c> (validation khÃ¡c nhau).
/// </summary>
public sealed class UserCreateOrEditRequest
{
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Avatar { get; set; }
    public bool? Status { get; set; }

    /// <summary>
    /// Táº¡o: rá»—ng hoáº·c null = gÃ¡n role máº·c Ä‘á»‹nh (customer). Sá»­a: null = khÃ´ng Ä‘á»•i; cÃ³ giÃ¡ trá»‹ = thay toÃ n bá»™.
    /// </summary>
    public IReadOnlyList<long>? RoleIds { get; set; }
}
