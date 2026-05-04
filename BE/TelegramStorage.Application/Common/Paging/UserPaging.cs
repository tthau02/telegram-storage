using TelegramStorage.Application.Common.Models;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Paging;

public static class UserPaging
{
    public static readonly IReadOnlyList<string> AllowedSortFields = new[]
    {
        nameof(User.UserName),
        nameof(User.Email),
        nameof(User.FullName),
        nameof(User.CreatedAt),
        nameof(User.Id),
    };

    public static string ResolveSortField(IPagedRequest request) =>
        PagedSortResolver.ResolveSortPropertyName<User>(
            request,
            AllowedSortFields,
            nameof(User.CreatedAt));
}
