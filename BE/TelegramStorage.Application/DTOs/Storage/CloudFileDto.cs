namespace TelegramStorage.Application.DTOs.Storage;

public class CloudFileDto
{
    public long Id { get; init; }

    public string FileName { get; init; } = string.Empty;

    public long TelegramMessageId { get; init; }

    public string FileHash { get; init; } = string.Empty;

    public long FileSize { get; init; }

    public string MimeType { get; init; } = string.Empty;

    public string? ThumbnailUrl { get; init; }

    public DateTimeOffset CreatedAt { get; init; }
}
