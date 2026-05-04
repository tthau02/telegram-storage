namespace TelegramStorage.Application.DTOs.Telegram;

public class TelegramLoginSessionStatusDto
{
    public bool Completed { get; init; }

    /// <summary>Next credential key expected by WTelegramClient (e.g. verification_code, password).</summary>
    public string? WaitingFor { get; init; }

    public string? Error { get; init; }
}
