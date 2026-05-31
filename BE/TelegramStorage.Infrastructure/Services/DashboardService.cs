using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.Common.Extensions;
using TelegramStorage.Application.DTOs.Dashboard;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Infrastructure.Data;

namespace TelegramStorage.Infrastructure.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly TelegramStorageDbContext _db;

    public DashboardService(TelegramStorageDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardStatsDto> GetUserStatsAsync(
        long userId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        CancellationToken cancellationToken)
    {
        // 1. Lấy khoảng thời gian mặc định nếu không truyền và chuẩn hóa đầu/cuối ngày
        var start = (fromDate ?? DateTimeOffset.UtcNow.AddDays(-30)).ToStartOfDay();
        var end = (toDate ?? DateTimeOffset.UtcNow).ToEndOfDay();

        // Đảm bảo start nhỏ hơn hoặc bằng end
        if (start > end)
        {
            var temp = start;
            start = end;
            end = temp;
        }

        // 2. Query logs trong khoảng thời gian của user đó
        var baseQuery = _db.TrafficLogs
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.IsDeleted);

        // Lấy tất cả uploads (bao gồm cả Local và Mirror) để tính tổng quan
        var uploadQuery = baseQuery.Where(t => t.Action == "UploadLocal" || t.Action == "UploadMirror");

        // 3. Tính toán các thống kê tổng quan (không bị giới hạn bởi từ ngày đến ngày để hiển thị thông tin chung,
        // hoặc giới hạn trong khoảng ngày? Người dùng muốn thống kê lại dữ liệu đã upload, thông thường
        // tổng số là trên toàn bộ hệ thống hoặc theo bộ lọc. Hãy cung cấp tổng số theo bộ lọc ngày để khớp với biểu đồ!)
        var filteredUploads = await uploadQuery
            .Where(t => t.CreatedAt >= start && t.CreatedAt <= end)
            .Select(t => new { t.Action, t.BytesTransferred, t.CreatedAt })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var totalBytes = filteredUploads.Sum(t => t.BytesTransferred);
        var totalFiles = filteredUploads.Count;

        var localUploads = filteredUploads.Where(t => t.Action == "UploadLocal").ToList();
        var mirrorUploads = filteredUploads.Where(t => t.Action == "UploadMirror").ToList();

        // 4. Nhóm theo ngày để vẽ biểu đồ
        // Chuyển nhóm theo ngày ở phía Client-side (in-memory) sau khi tải về để tránh lỗi múi giờ của Database.
        // Điều này đảm bảo hiển thị đúng múi giờ Local của hệ thống / người dùng.
        var dailyGrouped = filteredUploads
            .GroupBy(t => t.CreatedAt.ToLocalTime().Date)
            .Select(g => new DashboardDailyStatsDto
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                BytesUploaded = g.Sum(t => t.BytesTransferred),
                FilesUploaded = g.Count()
            })
            .ToDictionary(d => d.Date);

        // 5. Điền đầy đủ các ngày trống để biểu đồ liên tục
        var dailyStats = new List<DashboardDailyStatsDto>();
        var localStart = start.ToLocalTime().Date;
        var localEnd = end.ToLocalTime().Date;

        for (var date = localStart; date <= localEnd; date = date.AddDays(1))
        {
            var dateStr = date.ToString("yyyy-MM-dd");
            if (dailyGrouped.TryGetValue(dateStr, out var stat))
            {
                dailyStats.Add(stat);
            }
            else
            {
                dailyStats.Add(new DashboardDailyStatsDto
                {
                    Date = dateStr,
                    BytesUploaded = 0,
                    FilesUploaded = 0
                });
            }
        }

        // Tính toán dung lượng và số file thực tế hiện có trong kho lưu trữ (không bị giới hạn bởi khoảng lọc ngày)
        var activeFilesQuery = _db.CloudFiles
            .AsNoTracking()
            .Where(f => f.OwnerId == userId && !f.IsDeleted);

        var currentStorageBytes = await activeFilesQuery.SumAsync(f => f.FileSize, cancellationToken).ConfigureAwait(false);
        var currentFilesCount = await activeFilesQuery.CountAsync(cancellationToken).ConfigureAwait(false);

        return new DashboardStatsDto
        {
            TotalBytesUploaded = totalBytes,
            TotalFilesUploaded = totalFiles,
            UploadLocalBytes = localUploads.Sum(t => t.BytesTransferred),
            UploadMirrorBytes = mirrorUploads.Sum(t => t.BytesTransferred),
            UploadLocalCount = localUploads.Count,
            UploadMirrorCount = mirrorUploads.Count,
            CurrentStorageBytes = currentStorageBytes,
            CurrentFilesCount = currentFilesCount,
            DailyStats = dailyStats
        };
    }
}
