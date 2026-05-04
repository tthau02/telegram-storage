namespace TelegramStorage.Application.Options;

public class TelegramOptions
{
    public const string SectionName = "Telegram";

    public int ApiId { get; set; }

    public string ApiHash { get; set; } = string.Empty;

    public string SessionPath { get; set; } = "telegram.session";

    /// <summary>Chat/channel id as returned by <c>Messages_GetAllChats</c> keys (see WTelegramClient README).</summary>
    public long? TargetChannelId { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Token { get; set; }
}
