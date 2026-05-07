namespace TelegramStorage.Application.Interfaces.Services;

public interface IThumbnailService
{
    Task<ThumbnailResult> GenerateAsync(
        string sourceFilePath,
        string fileName,
        string mimeType,
        CancellationToken cancellationToken = default);
}

public sealed record ThumbnailResult(
    Stream Content,
    string FileName,
    string MimeType) : IAsyncDisposable
{
    public ValueTask DisposeAsync() => Content.DisposeAsync();
}
