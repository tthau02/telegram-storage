using System;
using System.Threading;
using System.Threading.Tasks;
using TelegramStorage.Application.DTOs.Dashboard;

namespace TelegramStorage.Application.Interfaces.Services;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetUserStatsAsync(
        long userId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        CancellationToken cancellationToken);
}
