using System.Net;
using System.Text.Json;
using FluentValidation;
using TelegramStorage.Application.Common.Models;

namespace TelegramStorage.Middleware;

public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            var errors = ex.Errors.Select(e => e.ErrorMessage).ToList();
            await WriteResponseAsync(
                context,
                HttpStatusCode.BadRequest,
                ApiResponse.Fail("Validation failed", (int)HttpStatusCode.BadRequest, errors));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found");
            await WriteResponseAsync(
                context,
                HttpStatusCode.NotFound,
                ApiResponse.Fail(ex.Message, (int)HttpStatusCode.NotFound));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation");
            await WriteResponseAsync(
                context,
                HttpStatusCode.BadRequest,
                ApiResponse.Fail(ex.Message, (int)HttpStatusCode.BadRequest));
        }
        catch (Exception ex) when (ex.GetType().Name == "WTException")
        {
            _logger.LogWarning(ex, "WTelegram client error");
            await WriteResponseAsync(
                context,
                HttpStatusCode.BadRequest,
                ApiResponse.Fail(ex.Message, (int)HttpStatusCode.BadRequest));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteResponseAsync(
                context,
                HttpStatusCode.InternalServerError,
                ApiResponse.Fail("An unexpected error occurred.", (int)HttpStatusCode.InternalServerError));
        }
    }

    private async Task WriteResponseAsync<T>(HttpContext context, HttpStatusCode status, ApiResponse<T> body)
    {
        if (context.Response.HasStarted)
        {
            // Response already started (for example streaming). Cannot modify headers/status now.
            _logger.LogWarning("Cannot write error response because the response has already started. Request path: {Path}", context.Request.Path);
            return;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)status;
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
    }
}
