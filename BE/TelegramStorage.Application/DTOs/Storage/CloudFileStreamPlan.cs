namespace TelegramStorage.Application.DTOs.Storage;

public sealed class CloudFileStreamPlan
{
    public required string ContentType { get; init; }
    public required long TotalLength { get; init; }
    public required long Start { get; init; }
    public required long End { get; init; }
    public required long ContentLength { get; init; }
    public required bool IsPartial { get; init; }
}
