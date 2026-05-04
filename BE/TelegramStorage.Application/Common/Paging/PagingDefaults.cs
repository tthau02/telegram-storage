using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Paging;

/// <summary>
/// GiÃ¡ trá»‹ máº·c Ä‘á»‹nh an toÃ n cho phÃ¢n trang (khÃ´ng chá»©a logic EF).
/// </summary>
public static class PagingDefaults
{
    /// <summary>CÃ¡c cá»™t Ä‘Æ°á»£c phÃ©p sort khi khÃ´ng truyá»n whitelist tÃ¹y chá»‰nh (chá»‰ thuá»™c tÃ­nh cá»§a <see cref="BaseEntity"/>).</summary>
    public static readonly IReadOnlySet<string> BaseEntitySortFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        nameof(BaseEntity.Id),
        nameof(BaseEntity.CreatedAt),
        nameof(BaseEntity.CreatedBy),
        nameof(BaseEntity.UpdatedAt),
        nameof(BaseEntity.UpdatedBy),
        nameof(BaseEntity.IsDeleted),
    };

    public const string DefaultSortProperty = nameof(BaseEntity.CreatedAt);
}
