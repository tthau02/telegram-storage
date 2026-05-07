using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Users;
using TelegramStorage.Application.Interfaces.Services;

namespace TelegramStorage.Controllers;

public sealed class AuthController : BaseController
{
    private readonly IUserService _users;

    public AuthController(IUserService users)
    {
        _users = users;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<UserDto>>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.RegisterAsync(request, cancellationToken);
        return OkResponse(user, "ÄÄƒng kÃ½ thÃ nh cÃ´ng.");
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _users.LoginAsync(request, cancellationToken);
        return OkResponse(result);
    }
    
    [HttpPost("logout")]
    [Authorize]
    public ActionResult<ApiResponse<object?>> Logout()
    {
        return NoContentResponse("Đã đăng xuất.");
    }
}
