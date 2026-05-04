using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Telegram;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Application.Options;

namespace TelegramStorage.Controllers;

/// <summary>MTProto login orchestration (OTP / 2FA). Cùng quyền đăng nhập như Cloud để có thể hoàn tất sau upload.</summary>
[Authorize]
public sealed class TelegramGatewayController : BaseController
{
    private readonly ITelegramGatewayService _gateway;
    private readonly IOptionsMonitor<TelegramOptions> _telegram;

    public TelegramGatewayController(
        ITelegramGatewayService gateway,
        IOptionsMonitor<TelegramOptions> telegram)
    {
        _gateway = gateway;
        _telegram = telegram;
    }

    /// <summary>Start user login; then poll session status and POST credentials when <see cref="TelegramLoginSessionStatusDto.WaitingFor"/> is set.</summary>
    [HttpPost("login/sessions")]
    public async Task<IActionResult> StartLogin(
        [FromBody] TelegramLoginStartRequest? request,
        CancellationToken cancellationToken)
    {
        var phone = !string.IsNullOrWhiteSpace(request?.PhoneNumber)
            ? request!.PhoneNumber!.Trim()
            : _telegram.CurrentValue.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(ApiResponse.Fail(
                "Cấu hình Telegram:PhoneNumber trong appsettings hoặc gửi phoneNumber trong body.",
                400));
        }

        var sessionId = await _gateway.StartLoginAsync(phone, cancellationToken).ConfigureAwait(false);
        return Ok(ApiResponse.Ok<object?>(new { sessionId }));
    }

    [HttpGet("login/sessions/{sessionId:guid}")]
    public async Task<ActionResult<ApiResponse<TelegramLoginSessionStatusDto>>> GetLoginSession(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var status = await _gateway.GetSessionStatusAsync(sessionId, cancellationToken).ConfigureAwait(false);
        if (status is null)
        {
            return NotFoundResponse("Session not found.");
        }

        return OkResponse(status);
    }

    [HttpPost("login/sessions/{sessionId:guid}/credential")]
    public async Task<ActionResult<ApiResponse<object?>>> SubmitCredential(
        Guid sessionId,
        [FromBody] TelegramLoginCredentialRequest request,
        CancellationToken cancellationToken)
    {
        await _gateway.SubmitCredentialAsync(sessionId, request.Value, cancellationToken).ConfigureAwait(false);
        return NoContentResponse("Credential accepted.");
    }
}
