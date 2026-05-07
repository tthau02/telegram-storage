namespace TelegramStorage.Domain.Entities;

public class CloudFile : BaseEntity
{
    public string FileName { get; set; } = string.Empty;

    public long TelegramMessageId { get; set; }

    public string FileHash { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public string MimeType { get; set; } = string.Empty;

    public long? ThumbnailFileId { get; set; }

    public string? ThumbnailUrl { get; set; }
}
