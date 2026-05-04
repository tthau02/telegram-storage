using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;

namespace TelegramStorage.Controllers;

/// <summary>
/// Pháº£n há»“i chuáº©n vÃ  context user tá»« HTTP â€” khÃ´ng chá»©a nghiá»‡p vá»¥, khÃ´ng gá»i DB hay service.
/// </summary>
[ApiController]
[Route("v1/api/[controller]")]
public abstract class BaseController : ControllerBase
{
    protected ActionResult<ApiResponse<T>> OkResponse<T>(T data, string? message = null) =>
        Ok(ApiResponse.Ok(data, message));

    protected ActionResult<ApiResponse<T>> CreatedResponse<T>(string actionName, object? routeValues, T data) =>
        CreatedAtAction(actionName, routeValues, ApiResponse.Ok(data));

    protected ActionResult<ApiResponse<object?>> NoContentResponse(string? message = null) =>
        Ok(ApiResponse.Ok<object?>(null, message ?? "Success"));

    protected ActionResult<ApiResponse<object?>> FailResponse(string message, int statusCode = 400) =>
        StatusCode(statusCode, ApiResponse.Fail(message, statusCode));

    /// <summary>404 vá»›i body <see cref="ApiResponse{T}"/> â€” dÃ¹ng khi khÃ´ng tÃ¬m tháº¥y tÃ i nguyÃªn.</summary>
    protected NotFoundObjectResult NotFoundResponse(string message) =>
        NotFound(ApiResponse.Fail(message, 404));

    protected long? CurrentUserId
    {
        get
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(userId, out var id) ? id : null;
        }
    }

    protected string? CurrentUserName => User.Identity?.Name;

    protected bool IsAuthenticated => User.Identity?.IsAuthenticated ?? false;
}
