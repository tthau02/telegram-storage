using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Common.Services;

/// <summary>
/// á»¨ng dá»¥ng service cÃ³ <see cref="IUnitOfWork"/> â€” táº¥t cáº£ module CRUD nÃªn káº¿ thá»«a, trÃ¡nh láº·p <c>Uow.Repository&lt;T&gt;()</c>.
/// </summary>
public abstract class AppServiceBase : ApplicationService
{
    protected IUnitOfWork Uow { get; }

    protected AppServiceBase(IUnitOfWork uow)
    {
        Uow = uow;
    }

    protected IRepository<T> Repo<T>()
        where T : BaseEntity =>
        Uow.Repository<T>();

    protected IQueryable<T> Q<T>()
        where T : BaseEntity =>
        Repo<T>().Query();
}
