using System;
using System.Collections.Generic;

namespace TelegramStorage.Application.DTOs.Dashboard;

public sealed class DashboardStatsDto
{
    public long TotalBytesUploaded { get; set; }
    public long TotalFilesUploaded { get; set; }
    public long UploadLocalBytes { get; set; }
    public long UploadMirrorBytes { get; set; }
    public long UploadLocalCount { get; set; }
    public long UploadMirrorCount { get; set; }
    public long CurrentStorageBytes { get; set; }
    public int CurrentFilesCount { get; set; }
    public List<DashboardDailyStatsDto> DailyStats { get; set; } = new();
}

public sealed class DashboardDailyStatsDto
{
    public string Date { get; set; } = string.Empty; // Định dạng yyyy-MM-dd
    public long BytesUploaded { get; set; }
    public long FilesUploaded { get; set; }
}
