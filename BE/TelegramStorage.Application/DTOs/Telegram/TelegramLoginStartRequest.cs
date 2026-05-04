namespace TelegramStorage.Application.DTOs.Telegram;

public class TelegramLoginStartRequest
{
    /// <summary>Nếu bỏ trống, server dùng <c>Telegram:PhoneNumber</c> trong appsettings.</summary>
    public string? PhoneNumber { get; set; }
}
