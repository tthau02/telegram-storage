namespace TelegramStorage.Application.Users.Queries;

/// <summary>
/// Truy váº¥n Ä‘á»c User/Role báº±ng LINQ (join), khÃ´ng dÃ¹ng Include â€” máº«u tÆ°Æ¡ng tá»± custom repository / query interface trong ABP.
/// </summary>
public interface IUserQuery
{
    Task<IReadOnlyList<string>> GetRoleNamesForUserAsync(long userId, CancellationToken cancellationToken = default);

    /// <summary>NhÃ³m tÃªn role theo UserId â€” dÃ¹ng sau khi phÃ¢n trang User Ä‘á»ƒ trÃ¡nh N+1.</summary>
    Task<IReadOnlyDictionary<long, IReadOnlyList<string>>> GetRoleNamesGroupedByUserIdsAsync(
        IReadOnlyCollection<long> userIds,
        CancellationToken cancellationToken = default);
}
