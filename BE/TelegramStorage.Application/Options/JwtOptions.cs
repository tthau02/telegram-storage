namespace TelegramStorage.Application.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    /// <summary>Mặc định 7 ngày khi không cấu hình trong appsettings.</summary>
    public int AccessTokenMinutes { get; set; } = 10080;
}
