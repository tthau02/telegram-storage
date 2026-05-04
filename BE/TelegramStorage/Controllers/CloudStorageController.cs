using System.Text.Json;
using System.Threading.Channels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.Interfaces.Services;

namespace TelegramStorage.Controllers;

/// <summary>Upload and streaming backed by Telegram storage.</summary>
[Authorize]
public sealed class CloudStorageController : BaseController
{
    /// <summary>Client gửi <c>1</c> hoặc <c>true</c> để nhận tiến độ Telegram (NDJSON).</summary>
    public const string NdjsonUploadProgressHeader = "X-Ndjson-Upload-Progress";

    private static readonly JsonSerializerOptions NdJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ICloudStorageService _storage;

    public CloudStorageController(ICloudStorageService storage)
    {
        _storage = storage;
    }

    [HttpPost("upload")]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    [RequestSizeLimit(long.MaxValue)]
    public async Task<IActionResult> UploadLocal(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail("File is required.", 400));
        }

        await using var stream = file.OpenReadStream();
        if (!WantsNdjsonUploadProgress(Request))
        {
            var dto = await _storage.UploadLocalAsync(
                    stream,
                    file.FileName,
                    file.ContentType,
                    file.Length,
                    CurrentUserId,
                    telegramUploadProgress: null,
                    cancellationToken)
                .ConfigureAwait(false);
            return Ok(ApiResponse.Ok(dto));
        }

        return await UploadLocalNdjsonAsync(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                cancellationToken)
            .ConfigureAwait(false);
    }

    private static bool WantsNdjsonUploadProgress(HttpRequest request)
    {
        var v = request.Headers[NdjsonUploadProgressHeader].FirstOrDefault();
        return string.Equals(v, "1", StringComparison.OrdinalIgnoreCase)
               || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<IActionResult> UploadLocalNdjsonAsync(
        Stream stream,
        string fileName,
        string contentType,
        long contentLength,
        CancellationToken cancellationToken)
    {
        Response.StatusCode = 200;
        Response.ContentType = "application/x-ndjson; charset=utf-8";
        Response.Headers.CacheControl = "no-store, no-cache";

        var channel = Channel.CreateUnbounded<(long Transmitted, long Total)>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        async Task PumpAsync()
        {
            await foreach (var (t, tot) in channel.Reader.ReadAllAsync(cancellationToken).ConfigureAwait(false))
            {
                var line = JsonSerializer.Serialize(
                    new { stage = "telegram", transmitted = t, total = tot },
                    NdJsonOptions);
                await Response.WriteAsync(line + "\n", cancellationToken).ConfigureAwait(false);
                await Response.Body.FlushAsync(cancellationToken).ConfigureAwait(false);
            }
        }

        var pumpTask = PumpAsync();
        var progress = new Progress<TelegramUploadProgress>(p =>
            channel.Writer.TryWrite((p.TransmittedBytes, p.TotalBytes)));

        try
        {
            var dto = await _storage.UploadLocalAsync(
                    stream,
                    fileName,
                    contentType,
                    contentLength,
                    CurrentUserId,
                    progress,
                    cancellationToken)
                .ConfigureAwait(false);

            channel.Writer.TryComplete();
            try
            {
                await pumpTask.ConfigureAwait(false);
            }
            catch
            {
                // Kênh có thể kết thúc kèm exception — bỏ qua khi upload đã thành công.
            }

            var endLine = JsonSerializer.Serialize(new { stage = "complete", data = dto }, NdJsonOptions);
            await Response.WriteAsync(endLine + "\n", cancellationToken).ConfigureAwait(false);
            await Response.Body.FlushAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            channel.Writer.TryComplete(ex);
            try
            {
                await pumpTask.ConfigureAwait(false);
            }
            catch
            {
                // expected
            }

            if (!Response.HasStarted)
            {
                return StatusCode(
                    500,
                    ApiResponse.Fail(ex.Message, 500));
            }

            var errLine = JsonSerializer.Serialize(
                new { stage = "error", message = ex.Message },
                NdJsonOptions);
            await Response.WriteAsync(errLine + "\n", cancellationToken).ConfigureAwait(false);
            await Response.Body.FlushAsync(cancellationToken).ConfigureAwait(false);
        }

        return new EmptyResult();
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<PagedResult<CloudFileDto>>>> Search(
        [FromQuery] CloudFileSearchRequest request,
        CancellationToken cancellationToken)
    {
        var page = await _storage.SearchAsync(request, cancellationToken).ConfigureAwait(false);
        return OkResponse(page);
    }

    [HttpPost("mirror")]
    public async Task<ActionResult<ApiResponse<CloudFileDto>>> Mirror(
        [FromBody] MirrorUploadRequest request,
        CancellationToken cancellationToken)
    {
        var dto = await _storage.UploadFromUrlAsync(request, CurrentUserId, cancellationToken).ConfigureAwait(false);
        return OkResponse(dto);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<CloudFileDto>>> GetMetadata(long id, CancellationToken cancellationToken)
    {
        var dto = await _storage.GetMetadataAsync(id, cancellationToken).ConfigureAwait(false);
        if (dto is null)
        {
            return NotFoundResponse("File not found.");
        }

        return OkResponse(dto);
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> Delete(long id, CancellationToken cancellationToken)
    {
        await _storage.DeleteAsync(id, cancellationToken).ConfigureAwait(false);
        return NoContentResponse("File deleted (soft delete; Telegram message removed when possible).");
    }

    /// <summary>Streams file bytes; honors <c>Range</c> for partial content (e.g. video seek).</summary>
    [HttpGet("{id:long}/stream")]
    [ResponseCache(NoStore = true)]
    public async Task<IActionResult> Stream(long id, CancellationToken cancellationToken)
    {
        var plan = await _storage
            .CreateStreamPlanAsync(id, Request.Headers.Range.ToString(), cancellationToken)
            .ConfigureAwait(false);

        if (plan is null)
        {
            return NotFound(ApiResponse.Fail("File not found.", 404));
        }

        Response.Headers.AcceptRanges = "bytes";
        Response.ContentType = plan.ContentType;
        if (plan.IsPartial)
        {
            Response.StatusCode = 206;
            Response.Headers.ContentRange = $"bytes {plan.Start}-{plan.End}/{plan.TotalLength}";
            await _storage.StreamAsync(
                    id,
                    plan.Start,
                    plan.ContentLength,
                    Response.Body,
                    precise: true,
                    CurrentUserId,
                    cancellationToken)
                .ConfigureAwait(false);
        }
        else
        {
            Response.StatusCode = 200;
            await _storage.StreamAsync(
                    id,
                    plan.Start,
                    plan.ContentLength,
                    Response.Body,
                    precise: true,
                    CurrentUserId,
                    cancellationToken)
                .ConfigureAwait(false);
        }

        return new EmptyResult();
    }
}
