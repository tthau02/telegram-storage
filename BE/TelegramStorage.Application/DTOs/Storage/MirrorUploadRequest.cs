namespace TelegramStorage.Application.DTOs.Storage;

public class MirrorUploadRequest
{
    public string Url { get; set; } = string.Empty;

    public string? FileName { get; set; }

    public string? MimeType { get; set; }
}
