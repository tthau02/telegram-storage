namespace TelegramStorage.Domain.Entities;

public class TrafficLog : BaseEntity
{
    public long? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public long BytesTransferred { get; set; }
    public string? IpAddress { get; set; }              // ← thêm
    public string? SourceUrl { get; set; }
    public long? CloudFileId { get; set; }
    public long? SharedLinkId { get; set; }             // ← thêm

    // Navigation
    public User? User { get; set; }
    public CloudFile? CloudFile { get; set; }
    public SharedLink? SharedLink { get; set; }
}
