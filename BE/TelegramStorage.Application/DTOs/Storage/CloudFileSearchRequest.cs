using TelegramStorage.Application.Common.Models;

namespace TelegramStorage.Application.DTOs.Storage;

/// <summary>Tìm kiếm + phân trang danh sách file cloud.</summary>
public sealed class CloudFileSearchRequest : PagedAndSortedRequest
{
    /// <summary>Lọc theo tên file (contains).</summary>
    public string? FileName { get; init; }

    /// <summary>Lọc theo MIME (contains, ví dụ video/).</summary>
    public string? MimeType { get; init; }

    public long? MinFileSize { get; init; }

    public long? MaxFileSize { get; init; }

    public DateTimeOffset? CreatedFrom { get; init; }

    public DateTimeOffset? CreatedTo { get; init; }

    /// <summary>Lọc file từng được mirror từ URL chứa chuỗi này (TrafficLogs).</summary>
    public string? SourceUrl { get; init; }

    /// <summary>Lọc theo thư mục cụ thể.</summary>
    public long? FolderId { get; init; }

    /// <summary>Chỉ lấy file không thuộc thư mục nào (FolderId == null).</summary>
    public bool RootFilesOnly { get; init; }
}
