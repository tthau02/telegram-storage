using System.Diagnostics;

namespace TelegramStorage.Infrastructure.IO;

/// <summary>Owns <see cref="HttpResponseMessage"/> until the content stream is finished.</summary>
internal sealed class HttpResponseOwnedStream : Stream
{
    private readonly HttpResponseMessage _response;
    private readonly Stream _inner;
    private bool _disposed;

    public HttpResponseOwnedStream(HttpResponseMessage response, Stream innerStream)
    {
        _response = response;
        _inner = innerStream;
    }

    public override bool CanRead => _inner.CanRead;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

    public override void Flush() => _inner.Flush();

    public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        _inner.ReadAsync(buffer, cancellationToken);

    protected override void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _disposed = true;
            _inner.Dispose();
            _response.Dispose();
        }

        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            _disposed = true;
            await _inner.DisposeAsync().ConfigureAwait(false);
            _response.Dispose();
        }
    }
}
