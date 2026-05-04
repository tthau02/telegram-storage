namespace TelegramStorage.Application.DTOs.Users;

public sealed class LoginRequest
{
    /// <summary>UserName hoáº·c Email</summary>
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
