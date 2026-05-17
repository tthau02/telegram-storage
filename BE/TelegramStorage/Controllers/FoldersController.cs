using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.Interfaces.Services;

namespace TelegramStorage.Controllers;

[Authorize]
public sealed class FoldersController : BaseController
{
    private readonly IFolderService _folders;

    public FoldersController(IFolderService folders)
    {
        _folders = folders;
    }

    [HttpGet("tree")]
    public async Task<ActionResult<ApiResponse<List<FolderDto>>>> GetTree(CancellationToken cancellationToken)
    {
        var tree = await _folders.GetTreeAsync(CurrentUserId, cancellationToken);
        return OkResponse(tree);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<FolderDto>>> Create(
        [FromBody] CreateFolderRequest request,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is null)
            return BadRequest(ApiResponse.Fail("Không xác định được người dùng.", 400));

        var dto = await _folders.CreateAsync(request, CurrentUserId.Value, cancellationToken);
        return OkResponse(dto);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ApiResponse<FolderDto>>> Rename(
        long id,
        [FromBody] RenameFolderRequest request,
        CancellationToken cancellationToken)
    {
        if (CurrentUserId is null)
            return BadRequest(ApiResponse.Fail("Không xác định được người dùng.", 400));

        var dto = await _folders.RenameAsync(id, request, CurrentUserId.Value, cancellationToken);
        return OkResponse(dto);
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(long id, CancellationToken cancellationToken)
    {
        if (CurrentUserId is null)
            return BadRequest(ApiResponse.Fail("Không xác định được người dùng.", 400));

        await _folders.DeleteAsync(id, CurrentUserId.Value, cancellationToken);
        return NoContentResponse("Đã xóa thư mục.");
    }
}
