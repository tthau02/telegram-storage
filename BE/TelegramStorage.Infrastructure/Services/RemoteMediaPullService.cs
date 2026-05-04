using System.Diagnostics;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.Interfaces.Services;
using TelegramStorage.Application.Options;
using TelegramStorage.Infrastructure.IO;

namespace TelegramStorage.Infrastructure.Services;

public sealed class RemoteMediaPullService : IRemoteMediaPullService
{
    public const string MirrorHttpClientName = "TelegramMirror";

    private readonly IOptionsMonitor<YtDlpOptions> _ytDlp;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<RemoteMediaPullService> _logger;

    public RemoteMediaPullService(
        IOptionsMonitor<YtDlpOptions> ytDlp,
        IHttpClientFactory httpFactory,
        ILogger<RemoteMediaPullService> logger)
    {
        _ytDlp = ytDlp;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public async Task<RemoteMediaResource> OpenAsync(
        string url,
        string? preferredFileName,
        string? preferredMimeType,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Only absolute http(s) URLs are allowed.", nameof(url));
        }

        var opts = _ytDlp.CurrentValue;
        var useYtDlp = opts.Enabled && (opts.PreferYtDlpForAllUrls || ShouldUseYtDlp(uri, opts));

        if (useYtDlp)
        {
            try
            {
                return await OpenWithYtDlpAsync(uri, url, preferredFileName, preferredMimeType, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex) when (opts.PreferYtDlpForAllUrls is false)
            {
                _logger.LogWarning(ex, "yt-dlp path failed for {Url}, falling back to HTTP GET.", url);
            }
        }

        return await OpenWithHttpAsync(url, preferredFileName, preferredMimeType, cancellationToken)
            .ConfigureAwait(false);
    }

    private static bool ShouldUseYtDlp(Uri uri, YtDlpOptions opts)
    {
        var host = uri.Host;
        foreach (var fragment in opts.SocialHostContains)
        {
            if (string.IsNullOrWhiteSpace(fragment))
            {
                continue;
            }

            if (host.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private async Task<RemoteMediaResource> OpenWithYtDlpAsync(
        Uri uri,
        string originalUrl,
        string? preferredFileName,
        string? preferredMimeType,
        CancellationToken cancellationToken)
    {
        var opts = _ytDlp.CurrentValue;
        var safeName = !string.IsNullOrWhiteSpace(preferredFileName)
            ? SanitizeFileName(preferredFileName!)
            : null;

        if (safeName is null)
        {
            var (title, ext) = await TryProbeTitleAndExtAsync(originalUrl, cancellationToken).ConfigureAwait(false);
            if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(ext))
            {
                safeName = SanitizeFileName($"{title}.{ext}");
            }
            else
            {
                safeName = SanitizeFileName($"remote-{uri.Host}-{Guid.NewGuid():N}.mp4");
            }
        }

        var mime = string.IsNullOrWhiteSpace(preferredMimeType)
            ? GuessMimeFromFileName(safeName)
            : preferredMimeType!;

        var process = StartYtDlpDownloadProcess(originalUrl, opts);
        var stdout = new YtDlpStdoutStream(process, _logger, cancellationToken);
        _logger.LogInformation("yt-dlp streaming from {Host} (format {Format}).", uri.Host, opts.Format);
        return new RemoteMediaResource(stdout, safeName, mime, contentLength: null);
    }

    private Process StartYtDlpDownloadProcess(string url, YtDlpOptions opts)
    {
        var psi = new ProcessStartInfo
        {
            FileName = opts.ExecutablePath,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };

        psi.ArgumentList.Add("-o");
        psi.ArgumentList.Add("-");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add(string.IsNullOrWhiteSpace(opts.Format) ? "best" : opts.Format);

        foreach (var a in opts.AdditionalArguments)
        {
            if (!string.IsNullOrWhiteSpace(a))
            {
                psi.ArgumentList.Add(a.Trim());
            }
        }

        psi.ArgumentList.Add(url);

        var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        if (!process.Start())
        {
            throw new InvalidOperationException($"Could not start process '{opts.ExecutablePath}'. Is yt-dlp installed and on PATH?");
        }

        return process;
    }

    private async Task<(string? Title, string? Ext)> TryProbeTitleAndExtAsync(string url, CancellationToken cancellationToken)
    {
        var opts = _ytDlp.CurrentValue;
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(opts.MetadataTimeoutSeconds, 5, 600)));

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = opts.ExecutablePath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };

            psi.ArgumentList.Add("--print");
            psi.ArgumentList.Add("%(title)s");
            psi.ArgumentList.Add("--print");
            psi.ArgumentList.Add("%(ext)s");
            psi.ArgumentList.Add("--skip-download");

            foreach (var a in opts.AdditionalArguments)
            {
                if (!string.IsNullOrWhiteSpace(a))
                {
                    psi.ArgumentList.Add(a.Trim());
                }
            }

            psi.ArgumentList.Add(url);

            using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
            if (!process.Start())
            {
                return (null, null);
            }

            var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);
            var title = await process.StandardOutput.ReadLineAsync(cts.Token).ConfigureAwait(false);
            var ext = await process.StandardOutput.ReadLineAsync(cts.Token).ConfigureAwait(false);
            await process.WaitForExitAsync(cts.Token).ConfigureAwait(false);
            _ = await stderrTask.ConfigureAwait(false);
            if (process.ExitCode != 0)
            {
                _logger.LogDebug("yt-dlp metadata probe failed with code {Code}.", process.ExitCode);
                return (null, null);
            }

            return (title, ext);
        }
        catch (OperationCanceledException)
        {
            return (null, null);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "yt-dlp metadata probe threw.");
            return (null, null);
        }
    }

    private async Task<RemoteMediaResource> OpenWithHttpAsync(
        string url,
        string? preferredFileName,
        string? preferredMimeType,
        CancellationToken cancellationToken)
    {
        var client = _httpFactory.CreateClient(MirrorHttpClientName);
        var response = await client
            .GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken)
            .ConfigureAwait(false);

        try
        {
            response.EnsureSuccessStatusCode();
        }
        catch
        {
            response.Dispose();
            throw;
        }

        var inner = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        var stream = new HttpResponseOwnedStream(response, inner);

        var fileName = preferredFileName;
        if (string.IsNullOrWhiteSpace(fileName))
        {
            fileName = TryGetFileName(response.Content.Headers) ?? "download.bin";
        }

        fileName = SanitizeFileName(fileName!);

        var mime = preferredMimeType;
        if (string.IsNullOrWhiteSpace(mime))
        {
            mime = response.Content.Headers.ContentType?.MediaType ?? GuessMimeFromFileName(fileName);
        }

        var contentLength = response.Content.Headers.ContentLength;
        return new RemoteMediaResource(stream, fileName, mime, contentLength);
    }

    private static string? TryGetFileName(HttpContentHeaders headers)
    {
        var cd = headers.ContentDisposition;
        if (cd is null)
        {
            return null;
        }

        return cd.FileNameStar ?? cd.FileName?.Trim('"');
    }

    private static string SanitizeFileName(string name)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return "download.bin";
        }

        foreach (var c in Path.GetInvalidFileNameChars())
        {
            trimmed = trimmed.Replace(c, '_');
        }

        const int maxLen = 180;
        if (trimmed.Length > maxLen)
        {
            var ext = Path.GetExtension(trimmed);
            var baseName = Path.GetFileNameWithoutExtension(trimmed);
            trimmed = baseName[..Math.Min(baseName.Length, maxLen - ext.Length)] + ext;
        }

        return string.IsNullOrWhiteSpace(trimmed) ? "download.bin" : trimmed;
    }

    private static string GuessMimeFromFileName(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mkv" => "video/x-matroska",
            ".m4a" => "audio/mp4",
            ".mp3" => "audio/mpeg",
            ".opus" => "audio/opus",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            _ => "application/octet-stream",
        };
    }
}
