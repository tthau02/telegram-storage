using TelegramStorage.Application.Common.Models;
using TelegramStorage.Application.Common.Paging;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Abstractions;

/// <summary>
/// Há»£p Ä‘á»“ng danh sÃ¡ch phÃ¢n trang chuáº©n â€” module Product, Orderâ€¦ chá»‰ cáº§n káº¿ thá»«a vá»›i DTO/request tÆ°Æ¡ng á»©ng.
/// </summary>
public interface IEntityPagedListService<TListDto, in TListRequest>
    where TListRequest : class, IPagedRequest
{
    Task<PagedResult<TListDto>> GetPagedAsync(TListRequest request, CancellationToken cancellationToken = default);
}
