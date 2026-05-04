using TelegramStorage.Application.DTOs.Storage;

namespace TelegramStorage.Application.Interfaces.Services;

/// <summary>
/// Opens a readable stream for a remote URL: social sites via yt-dlp (stdout pipe), direct file URLs via HTTP.
/// Does not persist the file on the API host except in memory/streaming buffers inside Telegram upload.
/// </summary>
public interface IRemoteMediaPullService
{
    /// <param name="preferredFileName">If set, used as upload name (sanitized).</param>
    /// <param name="preferredMimeType">If set, used when HTTP or yt-dlp does not provide a better hint.</param>
    Task<RemoteMediaResource> OpenAsync(
        string url,
        string? preferredFileName,
        string? preferredMimeType,
        CancellationToken cancellationToken = default);
}
