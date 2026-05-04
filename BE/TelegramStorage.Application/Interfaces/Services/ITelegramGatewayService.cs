using TelegramStorage.Application.DTOs.Telegram;

namespace TelegramStorage.Application.Interfaces.Services;

public interface ITelegramGatewayService
{
    Task<Guid> StartLoginAsync(string phoneNumber, CancellationToken cancellationToken = default);

    Task<TelegramLoginSessionStatusDto?> GetSessionStatusAsync(Guid sessionId, CancellationToken cancellationToken = default);

    Task SubmitCredentialAsync(Guid sessionId, string value, CancellationToken cancellationToken = default);
}
