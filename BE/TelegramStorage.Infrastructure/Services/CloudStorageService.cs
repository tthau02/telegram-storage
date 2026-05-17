using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.Common.Paging;
using TelegramStorage.Application.Common.Queryable;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Common.Query;
using TelegramStorage.Infrastructure.Data;

namespace TelegramStorage.Infrastructure.Services;

public sealed class CloudStorageService : ICloudStorageService
{
    private readonly TelegramStorageDbContext _db;
    private readonly TelegramMtProtoExecutor _telegram;
    private readonly IRemoteMediaPullService _remoteMedia;
    private readonly IThumbnailService _thumbnailService;
    private readonly ILogger<CloudStorageService> _logger;

    public CloudStorageService(
        TelegramStorageDbContext db,
        TelegramMtProtoExecutor telegram,
        IRemoteMediaPullService remoteMedia,
        IThumbnailService thumbnailService,
        ILogger<CloudStorageService> logger)
    {
        _db = db;
        _telegram = telegram;
        _remoteMedia = remoteMedia;
        _thumbnailService = thumbnailService;
        _logger = logger;
    }

    public Task<CloudFileDto> UploadLocalAsync(
        Stream content,
        string fileName,
        string? contentType,
        long? contentLength,
        long? userId,
        long? folderId = null,
        IProgress<TelegramUploadProgress>? telegramUploadProgress = null,
        CancellationToken cancellationToken = default) =>
        UploadCoreAsync(
            content,
            fileName,
            contentType,
            contentLength,
            userId,
            folderId,
            trafficAction: "UploadLocal",
            sourceUrl: null,
            telegramUploadProgress,
            cancellationToken);

    public Task<CloudFileDto> UploadFromUrlAsync(
        MirrorUploadRequest request,
        long? userId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(request.Url))
        {
            throw new ArgumentException("URL is required.", nameof(request));
        }

        return UploadFromUrlCoreAsync(request, userId, cancellationToken);
    }

    private async Task<CloudFileDto> UploadFromUrlCoreAsync(
        MirrorUploadRequest request,
        long? userId,
        CancellationToken cancellationToken)
    {
        await using var remote = await _remoteMedia
            .OpenAsync(request.Url, request.FileName, request.MimeType, cancellationToken)
            .ConfigureAwait(false);

        return await UploadCoreAsync(
                remote.Content,
                remote.FileName,
                remote.ContentType,
                remote.ContentLength,
                userId,
                request.FolderId,
                trafficAction: "UploadMirror",
                sourceUrl: request.Url,
                telegramUploadProgress: null,
                cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<CloudFileDto> UploadCoreAsync(
        Stream content,
        string fileName,
        string? contentType,
        long? contentLength,
        long? userId,
        long? folderId,
        string trafficAction,
        string? sourceUrl,
        IProgress<TelegramUploadProgress>? telegramUploadProgress,
        CancellationToken cancellationToken)
    {
        if (userId is null)
            throw new UnauthorizedAccessException("User ID is required to upload a file.");

        await _telegram.EnsureOperationalAsync(cancellationToken).ConfigureAwait(false);

        var mime = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType!;
        var tempFilePath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.upload");
        var originalMessageId = 0;
        var thumbnailMessageId = 0;

        try
        {
            await using (var tempWrite = File.Create(tempFilePath))
            {
                await content.CopyToAsync(tempWrite, cancellationToken).ConfigureAwait(false);
            }

            var size = new FileInfo(tempFilePath).Length;
            if (size == 0 && contentLength is > 0)
            {
                size = contentLength.Value;
            }

            string hashHex;
            await using (var hashStream = File.OpenRead(tempFilePath))
            {
                var hash = await SHA256.HashDataAsync(hashStream, cancellationToken).ConfigureAwait(false);
                hashHex = Convert.ToHexString(hash).ToLowerInvariant();
            }

            var duplicate = await _db.CloudFiles.AsNoTracking()
                .FirstOrDefaultAsync(f => f.FileHash == hashHex && !f.IsDeleted, cancellationToken)
                .ConfigureAwait(false);

            if (duplicate is not null)
            {
                await LogTrafficAsync(userId, trafficAction, size, sourceUrl, duplicate.Id, cancellationToken)
                    .ConfigureAwait(false);
                _logger.LogInformation("Duplicate file hash {Hash}; skipped new Telegram upload.", hashHex);
                return Map(duplicate);
            }

            await using (var originalStream = File.OpenRead(tempFilePath))
            {
                originalMessageId = await _telegram
                    .UploadAndSendDocumentAsync(originalStream, fileName, mime, telegramUploadProgress, cancellationToken)
                    .ConfigureAwait(false);
            }

            await using var thumbnail = await _thumbnailService
                .GenerateAsync(tempFilePath, fileName, mime, cancellationToken)
                .ConfigureAwait(false);
            thumbnailMessageId = await _telegram
                .UploadAndSendDocumentAsync(
                    thumbnail.Content,
                    thumbnail.FileName,
                    thumbnail.MimeType,
                    uploadProgress: null,
                    cancellationToken)
                .ConfigureAwait(false);

            var entity = new CloudFile
            {
                FileName = fileName,
                OwnerId = userId.Value,
                FolderId = folderId,
                TelegramMessageId = originalMessageId,
                FileHash = hashHex,
                FileSize = size,
                MimeType = mime,
                ThumbnailFileId = thumbnailMessageId,
                ThumbnailUrl = null,
                IsDeleted = false,
            };

            _db.CloudFiles.Add(entity);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await LogTrafficAsync(userId, trafficAction, size, sourceUrl, entity.Id, cancellationToken).ConfigureAwait(false);

            return Map(entity);
        }
        catch
        {
            if (originalMessageId > 0)
            {
                try
                {
                    await _telegram.DeleteChannelMessagesAsync(new[] { originalMessageId }, cancellationToken).ConfigureAwait(false);
                }
                catch
                {
                    // ignored
                }
            }

            if (thumbnailMessageId > 0)
            {
                try
                {
                    await _telegram.DeleteChannelMessagesAsync(new[] { thumbnailMessageId }, cancellationToken).ConfigureAwait(false);
                }
                catch
                {
                    // ignored
                }
            }

            throw;
        }
        finally
        {
            if (File.Exists(tempFilePath))
            {
                File.Delete(tempFilePath);
            }
        }
    }

    public async Task<CloudFileDto?> GetMetadataAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.CloudFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted, cancellationToken)
            .ConfigureAwait(false);
        return entity is null ? null : Map(entity);
    }

    public async Task<PagedResult<CloudFileDto>> SearchAsync(
        CloudFileSearchRequest request,
        long? userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var query = _db.CloudFiles.AsNoTracking().WhereNotDeleted();

        if (!isAdmin)
        {
            query = query.Where(f => f.OwnerId == userId);
        }

        query = ApplyCloudFileSearch(query, request);

        var page = await query
            .ToPagedResultAsync(request, CloudFilePaging.AllowedSortFields, nameof(CloudFile.CreatedAt), cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<CloudFileDto>
        {
            Items = page.Items.Select(Map).ToList(),
            Page = page.Page,
            PageSize = page.PageSize,
            TotalCount = page.TotalCount,
            SortedBy = page.SortedBy,
            IsDesc = page.IsDesc,
        };
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.CloudFiles
            .FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted, cancellationToken)
            .ConfigureAwait(false);

        if (entity is null)
        {
            throw new KeyNotFoundException("File not found.");
        }

        try
        {
            await _telegram.EnsureOperationalAsync(cancellationToken).ConfigureAwait(false);
            var messageIds = entity.ThumbnailFileId is > 0
                ? new[] { (int)entity.TelegramMessageId, (int)entity.ThumbnailFileId.Value }
                : new[] { (int)entity.TelegramMessageId };
            await _telegram
                .DeleteChannelMessagesAsync(messageIds, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not delete Telegram message {TelegramMessageId} for cloud file {FileId}.",
                entity.TelegramMessageId,
                id);
        }

        entity.IsDeleted = true;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<CloudFileStreamPlan?> CreateStreamPlanAsync(
        long cloudFileId,
        string? rangeHeader,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.CloudFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == cloudFileId && !f.IsDeleted, cancellationToken)
            .ConfigureAwait(false);

        if (entity is null)
        {
            return null;
        }

        await _telegram.EnsureOperationalAsync(cancellationToken).ConfigureAwait(false);
        var (_, total) = await _telegram
            .GetDocumentFileAsync((int)entity.TelegramMessageId, cancellationToken)
            .ConfigureAwait(false);

        if (total <= 0)
        {
            throw new InvalidOperationException("Could not determine file size from Telegram.");
        }

        var isPartial = TryParseSingleRange(rangeHeader, total, out var start, out var end);
        return new CloudFileStreamPlan
        {
            ContentType = entity.MimeType,
            TotalLength = total,
            Start = start,
            End = end,
            ContentLength = end - start + 1,
            IsPartial = isPartial,
        };
    }

    public async Task StreamAsync(
        long cloudFileId,
        long rangeStart,
        long length,
        Stream destination,
        bool precise,
        long? userId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.CloudFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == cloudFileId && !f.IsDeleted, cancellationToken)
            .ConfigureAwait(false);

        if (entity is null)
        {
            throw new InvalidOperationException("File not found.");
        }

        await _telegram.EnsureOperationalAsync(cancellationToken).ConfigureAwait(false);

        var (location, sourceSize) = await _telegram
            .GetDocumentFileAsync((int)entity.TelegramMessageId, cancellationToken)
            .ConfigureAwait(false);

        if (sourceSize <= 0)
        {
            throw new InvalidOperationException("Could not determine file size from Telegram.");
        }

        if (rangeStart < 0 || rangeStart >= sourceSize)
        {
            throw new InvalidOperationException("Requested stream range is out of bounds.");
        }

        var effectiveLength = Math.Min(length, sourceSize - rangeStart);
        if (effectiveLength <= 0)
        {
            return;
        }

        await _telegram
            .CopyFileBytesAsync(location, rangeStart, effectiveLength, destination, precise, cancellationToken)
            .ConfigureAwait(false);

        await LogTrafficAsync(userId, "Stream", effectiveLength, null, entity.Id, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> StreamThumbnailAsync(
        long cloudFileId,
        Stream destination,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.CloudFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == cloudFileId && !f.IsDeleted, cancellationToken)
            .ConfigureAwait(false);

        if (entity is null || entity.ThumbnailFileId is not > 0)
        {
            return false;
        }

        await _telegram.EnsureOperationalAsync(cancellationToken).ConfigureAwait(false);
        var (location, sourceSize) = await _telegram
            .GetDocumentFileAsync((int)entity.ThumbnailFileId.Value, cancellationToken)
            .ConfigureAwait(false);

        if (sourceSize <= 0)
        {
            return false;
        }

        await _telegram
            .CopyFileBytesAsync(location, 0, sourceSize, destination, precise: true, cancellationToken)
            .ConfigureAwait(false);
        return true;
    }

    private async Task LogTrafficAsync(
        long? userId,
        string action,
        long bytes,
        string? sourceUrl,
        long? cloudFileId,
        CancellationToken cancellationToken)
    {
        _db.TrafficLogs.Add(new TrafficLog
        {
            UserId = userId,
            Action = action,
            BytesTransferred = bytes,
            SourceUrl = sourceUrl,
            CloudFileId = cloudFileId,
            IsDeleted = false,
        });
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private IQueryable<CloudFile> ApplyCloudFileSearch(IQueryable<CloudFile> query, CloudFileSearchRequest r)
    {
        if (!string.IsNullOrWhiteSpace(r.FileName))
        {
            var t = r.FileName.Trim();
            query = query.Where(f => f.FileName.Contains(t));
        }

        if (!string.IsNullOrWhiteSpace(r.MimeType))
        {
            var t = r.MimeType.Trim();
            query = query.Where(f => f.MimeType.Contains(t));
        }

        if (r.MinFileSize is { } min && min > 0)
        {
            query = query.Where(f => f.FileSize >= min);
        }

        if (r.MaxFileSize is { } max && max > 0)
        {
            query = query.Where(f => f.FileSize <= max);
        }

        if (r.CreatedFrom is { } from)
        {
            query = query.Where(f => f.CreatedAt >= from);
        }

        if (r.CreatedTo is { } to)
        {
            query = query.Where(f => f.CreatedAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(r.SourceUrl))
        {
            var s = r.SourceUrl.Trim();
            query = query.Where(f => _db.TrafficLogs.Any(t =>
                t.CloudFileId == f.Id &&
                !t.IsDeleted &&
                t.SourceUrl != null &&
                t.SourceUrl.Contains(s)));
        }

        if (r.FolderId.HasValue)
        {
            query = query.Where(f => f.FolderId == r.FolderId.Value);
        }
        else if (r.RootFilesOnly)
        {
            query = query.Where(f => f.FolderId == null);
        }

        return query;
    }

    private static CloudFileDto Map(CloudFile e) =>
        new()
        {
            Id = e.Id,
            FileName = e.FileName,
            TelegramMessageId = e.TelegramMessageId,
            FileHash = e.FileHash,
            FileSize = e.FileSize,
            MimeType = e.MimeType,
            ThumbnailFileId = e.ThumbnailFileId,
            ThumbnailUrl = e.ThumbnailUrl,
            CreatedAt = e.CreatedAt,
            FolderId = e.FolderId,
        };

    private static bool TryParseSingleRange(string? rangeHeader, long totalLength, out long start, out long end)
    {
        start = 0;
        end = Math.Max(0, totalLength - 1);

        if (string.IsNullOrWhiteSpace(rangeHeader)
            || totalLength < 0
            || !rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var part = rangeHeader.AsSpan()["bytes=".Length..].Trim();
        var dash = part.IndexOf('-');
        if (dash < 0)
        {
            return false;
        }

        var startPart = part[..dash].Trim();
        var endPart = part[(dash + 1)..].Trim();

        if (startPart.IsEmpty && !endPart.IsEmpty)
        {
            if (!long.TryParse(endPart, out var suffix))
            {
                return false;
            }

            start = Math.Max(0, totalLength - suffix);
            end = totalLength - 1;
            return start <= end;
        }

        if (!long.TryParse(startPart, out var from))
        {
            return false;
        }

        start = from;
        if (endPart.IsEmpty)
        {
            end = totalLength - 1;
        }
        else if (!long.TryParse(endPart, out var to))
        {
            return false;
        }
        else
        {
            end = to;
        }

        if (start < 0 || end < start || start >= totalLength)
        {
            return false;
        }

        end = Math.Min(end, totalLength - 1);
        return true;
    }
}
