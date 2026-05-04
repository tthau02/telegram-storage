using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Users;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Application.Validators;

namespace TelegramStorage.Controllers;

[Authorize]
public sealed class UsersController : BaseController
{
    private readonly IUserService _users;

    public UsersController(IUserService users)
    {
        _users = users;
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserDto>>>> Search(
        [FromQuery] UserSearchRequest request,
        CancellationToken cancellationToken)
    {
        var page = await _users.GetPagedAsync(request, cancellationToken);
        return OkResponse(page.Items);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(long id, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFoundResponse("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng.");
        }
        return OkResponse(user);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create(
        [FromBody][CustomizeValidator(RuleSet = UserCreateOrEditRequestValidator.CreateRuleSet)] UserCreateOrEditRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.CreateAsync(request, cancellationToken);
        return OkResponse(user);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(
        long id,
        [FromBody][CustomizeValidator(RuleSet = UserCreateOrEditRequestValidator.UpdateRuleSet)] UserCreateOrEditRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.UpdateAsync(id, request, cancellationToken);
        return OkResponse(user);
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _users.DeleteAsync(id, cancellationToken);
        return NoContentResponse("ÄÃ£ xÃ³a (soft delete).");
    }
}
