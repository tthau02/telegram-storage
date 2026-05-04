using System.Text;
using System.Text.Json;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TelegramStorage.Application;
using TelegramStorage.Application.Options;
using TelegramStorage.Infrastructure;
using TelegramStorage.Infrastructure.Data;
using TelegramStorage.Infrastructure.Services;
using TelegramStorage.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpClient(RemoteMediaPullService.MirrorHttpClientName, client =>
{
    client.Timeout = TimeSpan.FromHours(2);
});

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrEmpty(jwt.Key) || jwt.Key.Length < 32)
{
    throw new InvalidOperationException("Cáº¥u hÃ¬nh Jwt:Key trong appsettings (tá»‘i thiá»ƒu 32 kÃ½ tá»±).");
}
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        };
    });

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "TelegramStorage", Version = "v1" });
    const string bearerScheme = "Bearer";
    options.AddSecurityDefinition(bearerScheme, new OpenApiSecurityScheme
    {
        Description = "JWT: dÃ¡n access token (Ä‘Äƒng nháº­p /v1/api/Auth/login). Chá»‰ dÃ¡n token, khÃ´ng gÃµ thÃªm chá»¯ Bearer.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = bearerScheme,
                },
            },
            Array.Empty<string>()
        },
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();
if (corsOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    corsOrigins =
    [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://localhost:3001",
        "https://localhost:3001",
    ];
}

if (corsOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(corsOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var sp = scope.ServiceProvider;
    var db = sp.GetRequiredService<TelegramStorageDbContext>();
    await db.Database.MigrateAsync();
    var log = sp.GetService<ILoggerFactory>();
    var logger = log?.CreateLogger("Database");
    await RoleDataSeeder.SeedAsync(db, logger, CancellationToken.None);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "TelegramStorage v1");
        //options.PersistAuthorization();
    });
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

// CORS must run before HTTPS redirection; redirecting OPTIONS breaks browser preflight (307).
if (corsOrigins.Length > 0)
{
    app.UseCors();
}

var runningInContainer = string.Equals(
    Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
    "true",
    StringComparison.OrdinalIgnoreCase);
if (!runningInContainer && !app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
