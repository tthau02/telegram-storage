namespace TelegramStorage.Application.DTOs.Storage;

public sealed class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public long? ParentId { get; set; }
}
