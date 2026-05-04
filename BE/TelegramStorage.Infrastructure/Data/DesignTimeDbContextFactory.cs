using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace TelegramStorage.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<TelegramStorageDbContext>
{
    public TelegramStorageDbContext CreateDbContext(string[] args)
    {
        var basePath = ResolveAppSettingsBasePath();

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found. Set it in TelegramStorage/appsettings.json.");

        var optionsBuilder = new DbContextOptionsBuilder<TelegramStorageDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new TelegramStorageDbContext(optionsBuilder.Options);
    }

    private static string ResolveAppSettingsBasePath()
    {
        var candidates = new[]
        {
            Directory.GetCurrentDirectory(),
            Path.Combine(Directory.GetCurrentDirectory(), "TelegramStorage"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "TelegramStorage"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "TelegramStorage"),
        };

        foreach (var candidate in candidates)
        {
            var full = Path.GetFullPath(candidate);
            var path = Path.Combine(full, "appsettings.json");
            if (File.Exists(path))
            {
                return full;
            }
        }

        throw new InvalidOperationException(
            "Could not find TelegramStorage/appsettings.json. Run from the solution folder, e.g. " +
            "dotnet ef migrations add ... --project TelegramStorage.Infrastructure --startup-project TelegramStorage");
    }
}
