namespace TelegramStorage.Application.Common.Models;

public class ApiResponse<T>
{
    public bool Success { get; init; }

    public string? Message { get; init; }

    public T? Data { get; init; }

    public IReadOnlyList<string>? Errors { get; init; }

    public int StatusCode { get; init; }
}

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message,
        StatusCode = 200,
    };

    public static ApiResponse<object?> Fail(
        string message,
        int statusCode = 400,
        IReadOnlyList<string>? errors = null) => new()
    {
        Success = false,
        Message = message,
        Errors = errors,
        StatusCode = statusCode,
        Data = null,
    };
}
