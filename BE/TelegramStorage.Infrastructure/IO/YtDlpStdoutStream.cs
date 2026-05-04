using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace TelegramStorage.Infrastructure.IO;

/// <summary>Reads yt-dlp stdout; on dispose waits for process and logs stderr if exit code is non-zero.</summary>
internal sealed class YtDlpStdoutStream : Stream
{
    private readonly Process _process;
    private readonly Stream _inner;
    private readonly Task<string> _stderrTask;
    private readonly ILogger _logger;
    private readonly CancellationTokenRegistration _killRegistration;
    private bool _disposed;

    public YtDlpStdoutStream(Process process, ILogger logger, CancellationToken cancellationToken)
    {
        _process = process;
        _inner = process.StandardOutput.BaseStream;
        _stderrTask = process.StandardError.ReadToEndAsync();
        _logger = logger;
        _killRegistration = cancellationToken.Register(static p =>
        {
            try
            {
                var proc = (Process)p!;
                if (!proc.HasExited)
                {
                    proc.Kill(entireProcessTree: true);
                }
            }
            catch
            {
                // ignored
            }
        }, process);
    }

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        _inner.ReadAsync(buffer, cancellationToken);

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_disposed)
        {
            DisposeCoreAsync().AsTask().GetAwaiter().GetResult();
        }

        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            await DisposeCoreAsync().ConfigureAwait(false);
        }
    }

    private async ValueTask DisposeCoreAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        await _killRegistration.DisposeAsync().ConfigureAwait(false);

        try
        {
            await _inner.DisposeAsync().ConfigureAwait(false);
        }
        catch
        {
            // ignored
        }

        try
        {
            if (!_process.HasExited)
            {
                _process.Kill(entireProcessTree: true);
            }

            await _process.WaitForExitAsync().ConfigureAwait(false);
        }
        catch
        {
            // ignored
        }

        var err = await _stderrTask.ConfigureAwait(false);
        if (_process.ExitCode != 0)
        {
            var excerpt = err.Length > 2000 ? err[..2000] + "..." : err;
            _logger.LogWarning("yt-dlp exited with code {Code}: {Stderr}", _process.ExitCode, excerpt);
        }

        _process.Dispose();
    }
}
