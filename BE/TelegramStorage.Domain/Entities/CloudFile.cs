namespace TelegramStorage.Domain.Entities;

public class CloudFile : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }            // ← tên sau rename
    public long TelegramMessageId { get; set; }
    public string TelegramChatId { get; set; } = string.Empty;  // ← multi-chat
    public string TelegramFileId { get; set; } = string.Empty;  // ← để download
    public string FileHash { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public long? ThumbnailFileId { get; set; }
    public string? ThumbnailUrl { get; set; }

    // ← Thêm mới
    public long OwnerId { get; set; }
    public long? FolderId { get; set; }                 // null = root
    public bool IsTrashed { get; set; } = false;
    public DateTime? TrashedAt { get; set; }
    public bool IsStarred { get; set; } = false;

    // Navigation
    public User Owner { get; set; } = null!;
    public Folder? Folder { get; set; }
    public ICollection<SharedLink> SharedLinks { get; set; } = new List<SharedLink>();
}
