using TelegramStorage.Application.DTOs.Telegram;
using TelegramStorage.Application.Interfaces.Services;

namespace TelegramStorage.Infrastructure.Services;

public sealed class TelegramGatewayService : ITelegramGatewayService
{
    private readonly TelegramMtProtoExecutor _executor;

    public TelegramGatewayService(TelegramMtProtoExecutor executor)
    {
        _executor = executor;
    }

    public Task<Guid> StartLoginAsync(string phoneNumber, CancellationToken cancellationToken = default) =>
        _executor.StartLoginAsync(phoneNumber, cancellationToken);

    public Task<TelegramLoginSessionStatusDto?> GetSessionStatusAsync(Guid sessionId, CancellationToken cancellationToken = default) =>
        _executor.GetLoginSessionAsync(sessionId, cancellationToken);

    public Task SubmitCredentialAsync(Guid sessionId, string value, CancellationToken cancellationToken = default) =>
        _executor.SubmitLoginCredentialAsync(sessionId, value, cancellationToken);
}
