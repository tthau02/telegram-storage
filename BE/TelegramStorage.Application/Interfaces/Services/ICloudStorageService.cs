using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Storage;

namespace TelegramStorage.Application.Interfaces.Services;

public interface ICloudStorageService
{
    Task<CloudFileDto> UploadLocalAsync(
        Stream content,
        string fileName,
        string? contentType,
        long? contentLength,
        long? userId,
        IProgress<TelegramUploadProgress>? telegramUploadProgress = null,
        CancellationToken cancellationToken = default);

    Task<CloudFileDto> UploadFromUrlAsync(MirrorUploadRequest request, long? userId, CancellationToken cancellationToken = default);

    Task<CloudFileDto?> GetMetadataAsync(long id, CancellationToken cancellationToken = default);

    Task<PagedResult<CloudFileDto>> SearchAsync(
        CloudFileSearchRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Xóa mềm trong DB và cố gắng xóa tin nhắn document trên Telegram.</summary>
    Task DeleteAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Builds a stream/range plan from request range header and Telegram source metadata.</summary>
    Task<CloudFileStreamPlan?> CreateStreamPlanAsync(
        long cloudFileId,
        string? rangeHeader,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Writes requested byte range to <paramref name="destination"/>.
    /// For video seeking, <paramref name="precise"/> should be true (upload.getFile precise flag).
    /// </summary>
    Task StreamAsync(
        long cloudFileId,
        long rangeStart,
        long length,
        Stream destination,
        bool precise,
        long? userId,
        CancellationToken cancellationToken = default);
}
