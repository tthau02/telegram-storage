using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Application.Users.Queries;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Infrastructure.Users.Queries;

public sealed class EfUserQuery : IUserQuery
{
    private readonly IUnitOfWork _uow;

    public EfUserQuery(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<string>> GetRoleNamesForUserAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        var userRoles = ActiveUserRoles().Where(ur => ur.UserId == userId);
        var roles = ActiveRoles();

        var q =
            from ur in userRoles
            join r in roles on ur.RoleId equals r.Id
            select r.Name;

        return await q.Distinct().ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<long, IReadOnlyList<string>>> GetRoleNamesGroupedByUserIdsAsync(
        IReadOnlyCollection<long> userIds,
        CancellationToken cancellationToken = default)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var idSet = userIds.Distinct().ToList();
        var userRoles = ActiveUserRoles().Where(ur => idSet.Contains(ur.UserId));
        var roles = ActiveRoles();

        var q =
            from ur in userRoles
            join r in roles on ur.RoleId equals r.Id
            select new { ur.UserId, r.Name };

        var rows = await q.ToListAsync(cancellationToken);
        return rows
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<string>)g.Select(x => x.Name).Distinct().ToList());
    }

    private IQueryable<UserRole> ActiveUserRoles() =>
        _uow.Repository<UserRole>().Query().Where(ur => !ur.IsDeleted);

    private IQueryable<Role> ActiveRoles() =>
        _uow.Repository<Role>().Query().Where(r => !r.IsDeleted);
}
