using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Interfaces.Services;

public interface IJwtTokenService
{
    (string token, DateTimeOffset expiresAtUtc) CreateToken(User user, IReadOnlyCollection<string> roleNames);
}
