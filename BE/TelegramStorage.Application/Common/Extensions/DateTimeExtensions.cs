using System;

namespace TelegramStorage.Application.Common.Extensions;

public static class DateTimeExtensions
{
    /// <summary>
    /// Chuyển đổi DateTimeOffset về đầu ngày (00:00:00.000) giữ nguyên Offset.
    /// </summary>
    public static DateTimeOffset ToStartOfDay(this DateTimeOffset dto)
    {
        return new DateTimeOffset(dto.Year, dto.Month, dto.Day, 0, 0, 0, 0, dto.Offset);
    }

    /// <summary>
    /// Chuyển đổi DateTimeOffset về cuối ngày (23:59:59.999) giữ nguyên Offset.
    /// </summary>
    public static DateTimeOffset ToEndOfDay(this DateTimeOffset dto)
    {
        return new DateTimeOffset(dto.Year, dto.Month, dto.Day, 23, 59, 59, 999, dto.Offset);
    }

    /// <summary>
    /// Chuyển đổi DateTimeOffset? về đầu ngày (00:00:00.000) nếu có giá trị.
    /// </summary>
    public static DateTimeOffset? ToStartOfDay(this DateTimeOffset? dto)
    {
        return dto?.ToStartOfDay();
    }

    /// <summary>
    /// Chuyển đổi DateTimeOffset? về cuối ngày (23:59:59.999) nếu có giá trị.
    /// </summary>
    public static DateTimeOffset? ToEndOfDay(this DateTimeOffset? dto)
    {
        return dto?.ToEndOfDay();
    }
}
