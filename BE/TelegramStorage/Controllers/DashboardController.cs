using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Dashboard;
using TelegramStorage.Application.Interfaces.Services;

namespace TelegramStorage.Controllers;

[Authorize]
public sealed class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<DashboardStatsDto>>> GetStats(
        [FromQuery] DateTimeOffset? fromDate,
        [FromQuery] DateTimeOffset? toDate,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is null)
        {
            return BadRequest(ApiResponse.Fail("Không xác định được người dùng.", 400));
        }

        var stats = await _dashboardService.GetUserStatsAsync(
            CurrentUserId.Value,
            fromDate,
            toDate,
            cancellationToken);

        return OkResponse(stats);
    }
}
