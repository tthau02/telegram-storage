using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Microsoft.Extensions.Logging;
using TelegramStorage.Application.Interfaces.Services;
using Xabe.FFmpeg;

namespace TelegramStorage.Infrastructure.Services;

public sealed class ThumbnailService : IThumbnailService
{
    private const int ThumbnailWidth = 320;
    private const int ThumbnailHeight = 180;
    private static readonly PngEncoder PngEncoder = new();
    private readonly ILogger<ThumbnailService> _logger;
    private readonly SemaphoreSlim _ffmpegGate = new(1, 1);
    private bool _ffmpegReady;

    public ThumbnailService(ILogger<ThumbnailService> logger)
    {
        _logger = logger;
    }

    public async Task<ThumbnailResult> GenerateAsync(
        string sourceFilePath,
        string fileName,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        if (mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return await BuildFromImageAsync(sourceFilePath, fileName, cancellationToken).ConfigureAwait(false);
        }

        if (mimeType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
        {
            var videoThumb = await TryBuildFromVideoAsync(sourceFilePath, fileName, cancellationToken).ConfigureAwait(false);
            if (videoThumb is not null)
            {
                return videoThumb;
            }
        }

        return await BuildDefaultAsync(fileName, cancellationToken).ConfigureAwait(false);
    }

    private static async Task<ThumbnailResult> BuildFromImageAsync(
        string sourceFilePath,
        string fileName,
        CancellationToken cancellationToken)
    {
        await using var source = File.OpenRead(sourceFilePath);
        using var image = await Image.LoadAsync(source, cancellationToken).ConfigureAwait(false);
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(ThumbnailWidth, ThumbnailHeight),
            Mode = ResizeMode.Crop,
            Position = AnchorPositionMode.Center,
        }));

        var output = new MemoryStream();
        await image.SaveAsync(output, PngEncoder, cancellationToken).ConfigureAwait(false);
        output.Position = 0;
        return new ThumbnailResult(output, $"{Path.GetFileNameWithoutExtension(fileName)}.thumb.png", "image/png");
    }

    private async Task<ThumbnailResult?> TryBuildFromVideoAsync(
        string sourceFilePath,
        string fileName,
        CancellationToken cancellationToken)
    {
        try
        {
            await EnsureFfmpegReadyAsync(cancellationToken).ConfigureAwait(false);
            var tempSnapshotPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.png");
            try
            {
                var mediaInfo = await FFmpeg.GetMediaInfo(sourceFilePath).ConfigureAwait(false);
                var timeOffsets = BuildVideoOffsets(mediaInfo.Duration);
                foreach (var offset in timeOffsets)
                {
                    try
                    {
                        var conversion = await FFmpeg.Conversions.FromSnippet
                            .Snapshot(sourceFilePath, tempSnapshotPath, offset)
                            .ConfigureAwait(false);
                        conversion.SetOverwriteOutput(true);
                        await conversion.Start(cancellationToken).ConfigureAwait(false);
                        if (File.Exists(tempSnapshotPath) && new FileInfo(tempSnapshotPath).Length > 0)
                        {
                            await using var snapshotStream = File.OpenRead(tempSnapshotPath);
                            using var snapshotImage = await Image.LoadAsync<Rgba32>(snapshotStream, cancellationToken).ConfigureAwait(false);
                            if (!IsLikelyUsableVideoFrame(snapshotImage))
                            {
                                _logger.LogWarning(
                                    "Snapshot appears black/blank; skipping offset {Offset}.",
                                    offset);
                                continue;
                            }

                            return await BuildFromImageAsync(tempSnapshotPath, fileName, cancellationToken).ConfigureAwait(false);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not extract video snapshot at {Offset}.", offset);
                    }
                }

                return null;
            }
            finally
            {
                if (File.Exists(tempSnapshotPath))
                {
                    File.Delete(tempSnapshotPath);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Video thumbnail generation failed for {FileName}.", fileName);
            return null;
        }
    }

    private static IEnumerable<TimeSpan> BuildVideoOffsets(TimeSpan duration)
    {
        if (duration <= TimeSpan.Zero)
        {
            return new[]
            {
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(3),
                TimeSpan.FromSeconds(0.5),
            };
        }

        var total = Math.Max(1.0, duration.TotalSeconds);
        var candidates = new[]
        {
            total * 0.15,
            total * 0.35,
            total * 0.55,
            total * 0.75,
        };

        var maxSeek = Math.Max(0.1, total - 0.1);
        return candidates
            .Select(s => TimeSpan.FromSeconds(Math.Clamp(s, 0.3, maxSeek)))
            .Distinct()
            .ToArray();
    }

    private static bool IsLikelyUsableVideoFrame(Image<Rgba32> image)
    {
        var sampleStep = Math.Max(1, Math.Min(image.Width, image.Height) / 64);
        double sum = 0;
        double sumSq = 0;
        var count = 0;

        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y += sampleStep)
            {
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < row.Length; x += sampleStep)
                {
                    var p = row[x];
                    var luminance = 0.2126 * p.R + 0.7152 * p.G + 0.0722 * p.B;
                    sum += luminance;
                    sumSq += luminance * luminance;
                    count++;
                }
            }
        });

        if (count == 0)
        {
            return false;
        }

        var avg = sum / count;
        var variance = (sumSq / count) - (avg * avg);
        var stdDev = Math.Sqrt(Math.Max(0, variance));

        // Reject near-black and near-flat frames (common for iPhone MOV first frames).
        return !(avg < 10 && stdDev < 8);
    }

    private async Task EnsureFfmpegReadyAsync(CancellationToken cancellationToken)
    {
        if (_ffmpegReady)
        {
            return;
        }

        await _ffmpegGate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_ffmpegReady)
            {
                return;
            }

            var ffmpegDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TelegramStorage",
                "ffmpeg");
            Directory.CreateDirectory(ffmpegDir);
            FFmpeg.SetExecutablesPath(ffmpegDir);

            var ffmpegExe = Path.Combine(ffmpegDir, "ffmpeg.exe");
            var ffprobeExe = Path.Combine(ffmpegDir, "ffprobe.exe");
            if (!File.Exists(ffmpegExe) || !File.Exists(ffprobeExe))
            {
                throw new FileNotFoundException(
                    $"FFmpeg binaries not found. Please place ffmpeg.exe and ffprobe.exe in '{ffmpegDir}'.");
            }

            _ffmpegReady = true;
        }
        finally
        {
            _ffmpegGate.Release();
        }
    }

    private static async Task<ThumbnailResult> BuildDefaultAsync(
        string fileName,
        CancellationToken cancellationToken)
    {
        using var image = new Image<Rgba32>(ThumbnailWidth, ThumbnailHeight);
        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < row.Length; x++)
                {
                    var inCenter = x >= 32 && x < 288 && y >= 24 && y < 156;
                    row[x] = inCenter ? new Rgba32(70, 130, 180) : new Rgba32(32, 32, 40);
                }
            }
        });

        var output = new MemoryStream();
        await image.SaveAsync(output, PngEncoder, cancellationToken).ConfigureAwait(false);
        output.Position = 0;
        return new ThumbnailResult(output, $"{Path.GetFileNameWithoutExtension(fileName)}.thumb.png", "image/png");
    }
}
