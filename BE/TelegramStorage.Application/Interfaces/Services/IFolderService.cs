using TelegramStorage.Application.DTOs.Storage;

namespace TelegramStorage.Application.Interfaces.Services;

public interface IFolderService
{
    Task<List<FolderDto>> GetTreeAsync(long? userId, CancellationToken cancellationToken = default);
    Task<FolderDto> CreateAsync(CreateFolderRequest request, long userId, CancellationToken cancellationToken = default);
    Task<FolderDto> RenameAsync(long id, RenameFolderRequest request, long userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
