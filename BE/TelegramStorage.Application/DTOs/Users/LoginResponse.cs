namespace TelegramStorage.Application.DTOs.Users;

public sealed class LoginResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public UserDto User { get; set; } = null!;
}
