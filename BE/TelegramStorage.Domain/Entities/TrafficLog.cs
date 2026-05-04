namespace TelegramStorage.Domain.Entities;

public class TrafficLog : BaseEntity
{
    public long? UserId { get; set; }
    public string Action { get; set; } = string.Empty;

    public long BytesTransferred { get; set; }

    public string? SourceUrl { get; set; }

    public long? CloudFileId { get; set; }

    public CloudFile? CloudFile { get; set; }
}
