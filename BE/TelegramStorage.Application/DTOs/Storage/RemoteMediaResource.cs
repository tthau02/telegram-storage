namespace TelegramStorage.Application.DTOs.Storage;

/// <summary>
/// A readable media stream from a remote URL (HTTP direct or yt-dlp stdout). Dispose asynchronously to release child processes.
/// </summary>
public sealed class RemoteMediaResource : IAsyncDisposable
{
    private readonly Func<ValueTask>? _onDisposeAsync;
    private bool _disposed;

    public RemoteMediaResource(
        Stream content,
        string fileName,
        string? contentType,
        long? contentLength,
        Func<ValueTask>? onDisposeAsync = null)
    {
        Content = content;
        FileName = fileName;
        ContentType = contentType;
        ContentLength = contentLength;
        _onDisposeAsync = onDisposeAsync;
    }

    public Stream Content { get; }

    public string FileName { get; }

    public string? ContentType { get; }

    public long? ContentLength { get; }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        await Content.DisposeAsync().ConfigureAwait(false);
        if (_onDisposeAsync is not null)
        {
            await _onDisposeAsync().ConfigureAwait(false);
        }
    }
}
