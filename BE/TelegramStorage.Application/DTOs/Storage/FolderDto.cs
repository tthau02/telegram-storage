namespace TelegramStorage.Application.DTOs.Storage;

public sealed class FolderDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long OwnerId { get; set; }
    public long? ParentId { get; set; }
    public bool IsStarred { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int FileCount { get; set; }
    public int ChildrenCount { get; set; }
}
