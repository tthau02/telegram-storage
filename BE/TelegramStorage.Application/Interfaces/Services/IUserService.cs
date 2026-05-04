using TelegramStorage.Application.Common.Abstractions;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.DTOs.Users;

namespace TelegramStorage.Application.Interfaces.Services;

public interface IUserService
    : IEntityPagedListService<UserDto, UserSearchRequest>
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<UserDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<UserDto> CreateAsync(UserCreateOrEditRequest request, CancellationToken cancellationToken = default);

    Task<UserDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);

    Task<UserDto> UpdateAsync(long id, UserCreateOrEditRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(long id, CancellationToken cancellationToken = default);
}