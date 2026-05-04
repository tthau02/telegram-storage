namespace TelegramStorage.Application.Options;

/// <summary>External yt-dlp process for pulling media from YouTube, TikTok, Facebook, etc. (streamed to Telegram, not saved to user PC).</summary>
public class YtDlpOptions
{
    public const string SectionName = "YtDlp";

    /// <summary>When true, URLs whose host matches <see cref="SocialHostContains"/> use yt-dlp first; others use plain HTTP.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Executable name on PATH (e.g. yt-dlp) or absolute path.</summary>
    public string ExecutablePath { get; set; } = "yt-dlp";

    /// <summary>Format selector. For stdout, prefer a single muxed container; merging may require ffmpeg on the server.</summary>
    public string Format { get; set; } = "bv*+ba/bestvideo+bestaudio/best";

    /// <summary>Extra CLI args before the URL.</summary>
    public string[] AdditionalArguments { get; set; } =
    [
        "--no-playlist",
        "--no-warnings",
    ];

    /// <summary>If true, attempt yt-dlp for every http(s) URL before HTTP fallback.</summary>
    public bool PreferYtDlpForAllUrls { get; set; }

    /// <summary>Case-insensitive substrings matched against host (e.g. youtube.com, youtu.be).</summary>
    public string[] SocialHostContains { get; set; } =
    [
        "youtube.com",
        "youtu.be",
        "tiktok.com",
        "facebook.com",
        "fb.watch",
        "instagram.com",
        "vimeo.com",
        "twitter.com",
        "x.com",
    ];

    /// <summary>Timeout for metadata probe (--skip-download). Not applied to full download (use request cancellation).</summary>
    public int MetadataTimeoutSeconds { get; set; } = 120;
}
