using AutoMapper;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TelegramStorage.Application.Common.Constants;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.Common.Paging;
using TelegramStorage.Application.Common.Queryable;
using TelegramStorage.Application.Common.Services;
using TelegramStorage.Application.DTOs.Users;
using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Application.Users.Queries;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Common.Query;

namespace TelegramStorage.Infrastructure.Services;

public sealed class UserService : AppServiceBase, IUserService
{
    private readonly IUserQuery _userQuery;
    private readonly IMapper _mapper;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenService _jwt;

    public UserService(
        IUnitOfWork uow,
        IUserQuery userQuery,
        IMapper mapper,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenService jwt)
        : base(uow)
    {
        _userQuery = userQuery;
        _mapper = mapper;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
    }

    private IQueryable<User> ActiveUsers() => Q<User>().WhereNotDeleted();

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var key = request.Login.Trim();
        var user = await ActiveUsers()
            .FirstOrDefaultAsync(
                u => u.UserName == key || u.Email == key,
                cancellationToken);
        if (user is null)
        {
            throw new ValidationException(new[] { new ValidationFailure("", "Sai tÃªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u.") });
        }
        if (!user.Status)
        {
            throw new ValidationException(new[] { new ValidationFailure("", "TÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a.") });
        }
        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
        {
            throw new ValidationException(new[] { new ValidationFailure("", "Sai tÃªn Ä‘Äƒng nháº­p hoáº·c máº­t kháº©u.") });
        }
        var roleNames = await _userQuery.GetRoleNamesForUserAsync(user.Id, cancellationToken);
        var (token, exp) = _jwt.CreateToken(user, roleNames);
        return new LoginResponse
        {
            AccessToken = token,
            ExpiresAtUtc = exp,
            User = ToUserDto(user, roleNames),
        };
    }

    public async Task<UserDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        await ThrowIfDuplicateUserNameOrEmailAsync(request.UserName, request.Email, null, cancellationToken);
        var user = _mapper.Map<User>(request);
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        Uow.Repository<User>().Add(user);
        await Uow.SaveChangesAsync(cancellationToken);
        var role = await GetRoleByNameAsync(RoleNames.Customer, cancellationToken);
        if (role is null)
        {
            throw new InvalidOperationException("Vai trÃ² máº·c Ä‘á»‹nh (customer) chÆ°a tá»“n táº¡i. HÃ£y seed báº£ng Roles.");
        }
        Uow.Repository<UserRole>().Add(
            new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
            });
        await Uow.SaveChangesAsync(cancellationToken);
        return await GetUserDtoByIdAsync(user.Id, cancellationToken) ?? ToUserDto(user, Array.Empty<string>());
    }

    public async Task<UserDto> CreateAsync(UserCreateOrEditRequest request, CancellationToken cancellationToken = default)
    {
        await ThrowIfDuplicateUserNameOrEmailAsync(request.UserName!, request.Email!, null, cancellationToken);
        var user = _mapper.Map<User>(request);
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password!);
        Uow.Repository<User>().Add(user);
        await Uow.SaveChangesAsync(cancellationToken);

        var roleIdsToAssign = request.RoleIds is { Count: > 0 }
            ? request.RoleIds.Distinct().ToList()
            : new List<long>
            {
                (await GetRoleByNameAsync(RoleNames.Customer, cancellationToken))?.Id
                ?? throw new InvalidOperationException("Vai trÃ² máº·c Ä‘á»‹nh (customer) chÆ°a tá»“n táº¡i."),
            };

        var found = await Uow.Repository<Role>().Query()
            .Where(r => roleIdsToAssign.Contains(r.Id) && !r.IsDeleted)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);
        if (found.Count != roleIdsToAssign.Count)
        {
            throw new ValidationException(new[] { new ValidationFailure(nameof(request.RoleIds), "Má»™t hoáº·c nhiá»u RoleId khÃ´ng há»£p lá»‡.") });
        }
        foreach (var roleId in roleIdsToAssign)
        {
            Uow.Repository<UserRole>().Add(new UserRole { UserId = user.Id, RoleId = roleId });
        }
        await Uow.SaveChangesAsync(cancellationToken);
        return await GetUserDtoByIdAsync(user.Id, cancellationToken) ?? ToUserDto(user, Array.Empty<string>());
    }

    public async Task<UserDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return await GetUserDtoByIdAsync(id, cancellationToken);
    }

    public async Task<PagedResult<UserDto>> GetPagedAsync(UserSearchRequest request, CancellationToken cancellationToken = default)
    {
        var filtered = ApplyUserSearch(ActiveUsers(), request);
        var page = await filtered
            .ToPagedResultAsync(
                request,
                UserPaging.AllowedSortFields,
                nameof(User.CreatedAt),
                cancellationToken);

        var rolesByUser = await _userQuery.GetRoleNamesGroupedByUserIdsAsync(
            page.Items.Select(u => u.Id).ToList(),
            cancellationToken);

        var items = page.Items
            .Select(u => ToUserDto(
                u,
                rolesByUser.TryGetValue(u.Id, out var r) ? r : Array.Empty<string>()))
            .ToList();

        return new PagedResult<UserDto>
        {
            Items = items,
            Page = page.Page,
            PageSize = page.PageSize,
            TotalCount = page.TotalCount,
            SortedBy = page.SortedBy,
            IsDesc = page.IsDesc,
        };
    }

    private static IQueryable<User> ApplyUserSearch(IQueryable<User> query, UserSearchRequest r)
    {
        if (!string.IsNullOrWhiteSpace(r.UserName))
        {
            var t = r.UserName.Trim();
            query = query.Where(u => u.UserName.Contains(t));
        }
        if (!string.IsNullOrWhiteSpace(r.FullName))
        {
            var t = r.FullName.Trim();
            query = query.Where(u => u.FullName.Contains(t));
        }
        if (r.Status.HasValue)
        {
            query = query.Where(u => u.Status == r.Status.Value);
        }
        if (r.RoleId.HasValue)
        {
            var roleId = r.RoleId.Value;
            query = query.Where(u => u.UserRoles.Any(ur => !ur.IsDeleted && ur.RoleId == roleId));
        }
        else if (!string.IsNullOrWhiteSpace(r.RoleName))
        {
            var name = r.RoleName.Trim();
            query = query.Where(u => u.UserRoles.Any(ur => !ur.IsDeleted && ur.Role != null && ur.Role.Name == name));
        }
        return query;
    }

    public async Task<UserDto> UpdateAsync(long id, UserCreateOrEditRequest request, CancellationToken cancellationToken = default)
    {
        var user = await Uow.Repository<User>().Query()
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user is null)
        {
            throw new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng.");
        }
        if (request.FullName is not null) user.FullName = request.FullName;
        if (request.Email is not null)
        {
            if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                await ThrowIfDuplicateUserNameOrEmailAsync(null, request.Email, id, cancellationToken);
            }
            user.Email = request.Email;
        }
        if (request.PhoneNumber is not null) user.PhoneNumber = request.PhoneNumber;
        if (request.Avatar is not null) user.Avatar = request.Avatar;
        if (request.Status is not null) user.Status = request.Status.Value;
        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        }
        if (request.RoleIds is not null)
        {
            var distinctIds = request.RoleIds.Distinct().ToList();
            var valid = await Uow.Repository<Role>().Query()
                .Where(r => distinctIds.Contains(r.Id) && !r.IsDeleted)
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);
            if (valid.Count != distinctIds.Count)
            {
                throw new ValidationException(new[] { new ValidationFailure(nameof(request.RoleIds), "Má»™t hoáº·c nhiá»u RoleId khÃ´ng tá»“n táº¡i.") });
            }
            var urset = Uow.Repository<UserRole>();
            var existing = await urset.Query()
                .Where(ur => ur.UserId == id)
                .ToListAsync(cancellationToken);
            foreach (var e in existing)
            {
                urset.Remove(e);
            }
            await Uow.SaveChangesAsync(cancellationToken);
            foreach (var roleId in distinctIds)
            {
                urset.Add(new UserRole { UserId = id, RoleId = roleId });
            }
        }
        Uow.Repository<User>().Update(user);
        await Uow.SaveChangesAsync(cancellationToken);
        return await GetUserDtoByIdAsync(id, cancellationToken) ?? ToUserDto(user, Array.Empty<string>());
    }

    public async Task DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await Uow.Repository<User>().GetByIdAsync(id, cancellationToken);
        if (user is null || user.IsDeleted)
        {
            throw new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng.");
        }
        user.IsDeleted = true;
        Uow.Repository<User>().Update(user);
        await Uow.SaveChangesAsync(cancellationToken);
    }

    private async Task<UserDto?> GetUserDtoByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var user = await Uow.Repository<User>().Query()
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (user is null)
        {
            return null;
        }
        var roles = await _userQuery.GetRoleNamesForUserAsync(id, cancellationToken);
        return ToUserDto(user, roles);
    }

    private UserDto ToUserDto(User user, IReadOnlyList<string> roleNames)
    {
        var dto = _mapper.Map<UserDto>(user);
        dto.Roles = roleNames;
        return dto;
    }

    private async Task<Role?> GetRoleByNameAsync(string name, CancellationToken cancellationToken = default) =>
        await Uow.Repository<Role>().Query()
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == name && !r.IsDeleted, cancellationToken);

    private async Task ThrowIfDuplicateUserNameOrEmailAsync(
        string? userName,
        string? email,
        long? exceptUserId,
        CancellationToken cancellationToken)
    {
        if (userName is not null)
        {
            var taken = await ActiveUsers()
                .AnyAsync(x => x.UserName == userName && (exceptUserId == null || x.Id != exceptUserId), cancellationToken);
            if (taken)
            {
                throw new ValidationException(new[] { new ValidationFailure("UserName", "TÃªn Ä‘Äƒng nháº­p Ä‘Ã£ tá»“n táº¡i.") });
            }
        }
        if (email is not null)
        {
            var taken = await ActiveUsers()
                .AnyAsync(x => x.Email == email && (exceptUserId == null || x.Id != exceptUserId), cancellationToken);
            if (taken)
            {
                throw new ValidationException(new[] { new ValidationFailure("Email", "Email Ä‘Ã£ tá»“n táº¡i.") });
            }
        }
    }
}
