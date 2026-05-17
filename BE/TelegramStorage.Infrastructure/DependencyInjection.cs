using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TelegramStorage.Application.Interfaces.Repositories;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Application.Options;
using TelegramStorage.Application.Users.Queries;
using TelegramStorage.Domain.Entities;
using TelegramStorage.Infrastructure.Data;
using TelegramStorage.Infrastructure.Data.Interceptors;
using TelegramStorage.Infrastructure.Repositories;
using TelegramStorage.Infrastructure.Services;
using TelegramStorage.Infrastructure.Users.Queries;

namespace TelegramStorage.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddOptions<TelegramOptions>()
            .Bind(configuration.GetSection(TelegramOptions.SectionName));
        services.AddOptions<YtDlpOptions>()
            .Bind(configuration.GetSection(YtDlpOptions.SectionName));

        services.AddSingleton<AuditableEntitySaveChangesInterceptor>();

        services.AddSingleton<TelegramMtProtoExecutor>();
        services.AddSingleton<ITelegramGatewayService, TelegramGatewayService>();
        services.AddSingleton<IRemoteMediaPullService, RemoteMediaPullService>();
        services.AddSingleton<IThumbnailService, ThumbnailService>();
        services.AddScoped<ICloudStorageService, CloudStorageService>();
        services.AddScoped<IFolderService, FolderService>();

        services.AddDbContext<TelegramStorageDbContext>((sp, options) =>
        {
            options.UseSqlServer(connectionString)
                .AddInterceptors(sp.GetRequiredService<AuditableEntitySaveChangesInterceptor>());
        });

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName));

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IUserService, UserService>();

        services.AddScoped<IUserQuery, EfUserQuery>();

        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
