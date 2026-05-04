using TelegramStorage.Application.Common.Models;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Paging;

public static class CloudFilePaging
{
    public static readonly IReadOnlyList<string> AllowedSortFields =
    [
        nameof(CloudFile.Id),
        nameof(CloudFile.FileName),
        nameof(CloudFile.FileSize),
        nameof(CloudFile.MimeType),
        nameof(CloudFile.CreatedAt),
        nameof(CloudFile.UpdatedAt),
    ];

    public static string ResolveSortField(IPagedRequest request) =>
        PagedSortResolver.ResolveSortPropertyName<CloudFile>(
            request,
            AllowedSortFields,
            nameof(CloudFile.CreatedAt));
}
