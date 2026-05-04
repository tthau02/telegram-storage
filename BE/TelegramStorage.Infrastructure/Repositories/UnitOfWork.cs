using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Data;
using TelegramStorage.Infrastructure.Repositories;
using System;

public class UnitOfWork : IUnitOfWork, IDisposable
{
    private readonly TelegramStorageDbContext _db;
    private readonly Dictionary<Type, object> _repositories = new();

    public UnitOfWork(TelegramStorageDbContext db)
    {
        _db = db;
    }

    public IRepository<T> Repository<T>() where T : BaseEntity
    {
        var type = typeof(T);

        if (!_repositories.ContainsKey(type))
        {
            _repositories[type] = new Repository<T>(_db);
        }

        return (IRepository<T>)_repositories[type];
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _db.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}