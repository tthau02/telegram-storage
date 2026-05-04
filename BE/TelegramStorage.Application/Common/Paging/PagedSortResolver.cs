using System.Reflection;
using TelegramStorage.Application.Common.Models;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Paging;

/// <summary>
/// Chá»n cá»™t sort an toÃ n (whitelist + tÃªn thuá»™c tÃ­nh CLR) â€” dÃ¹ng chung cho repository/service.
/// </summary>
public static class PagedSortResolver
{
    public static string ResolveSortPropertyName<T>(
        IPagedRequest request,
        IReadOnlyCollection<string>? allowedSortProperties,
        string defaultPropertyName)
        where T : BaseEntity
    {
        var effectiveWhitelist = BuildEffectiveWhitelist<T>(allowedSortProperties);
        var requested = request.SortBy?.Trim();
        if (string.IsNullOrEmpty(requested))
        {
            return ResolveClrPropertyName(typeof(T), defaultPropertyName);
        }

        foreach (var candidate in effectiveWhitelist)
        {
            if (!candidate.Equals(requested, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var resolved = typeof(T).GetProperty(
                candidate,
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

            if (resolved != null)
            {
                return resolved.Name;
            }
        }

        return ResolveClrPropertyName(typeof(T), defaultPropertyName);
    }

    private static IReadOnlyCollection<string> BuildEffectiveWhitelist<T>(
        IReadOnlyCollection<string>? allowedSortProperties)
        where T : BaseEntity
    {
        if (allowedSortProperties is { Count: > 0 })
        {
            return allowedSortProperties;
        }

        return PagingDefaults.BaseEntitySortFields
            .Where(name => typeof(T).GetProperty(
                name,
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase) != null)
            .ToArray();
    }

    private static string ResolveClrPropertyName(Type entityType, string propertyName)
    {
        var prop = entityType.GetProperty(
            propertyName,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        return prop?.Name ?? nameof(BaseEntity.Id);
    }
}
