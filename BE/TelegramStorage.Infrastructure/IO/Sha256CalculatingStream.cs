using System.Security.Cryptography;

namespace TelegramStorage.Infrastructure.IO;

/// <summary>Reads from an inner stream and computes SHA-256 in one pass.</summary>
internal sealed class Sha256CalculatingStream : Stream
{
    private readonly Stream _inner;
    private readonly bool _leaveInnerOpen;
    private readonly IncrementalHash _hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
    private byte[]? _finalHash;
    private bool _disposed;

    public Sha256CalculatingStream(Stream inner, bool leaveInnerOpen)
    {
        _inner = inner;
        _leaveInnerOpen = leaveInnerOpen;
    }

    public long BytesObserved { get; private set; }

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

    public byte[] GetFinalHash()
    {
        if (_finalHash is not null)
            return (byte[])_finalHash.Clone();

        if (_disposed)
            throw new ObjectDisposedException(nameof(Sha256CalculatingStream), "Final hash is not available because the stream has been disposed before it could be computed.");

        _finalHash = _hash.GetHashAndReset();
        return (byte[])_finalHash.Clone();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        var n = _inner.Read(buffer, offset, count);
        if (n > 0)
        {
            _hash.AppendData(buffer, offset, n);
            BytesObserved += n;
        }

        return n;
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        var n = await _inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false);
        if (n > 0)
        {
            _hash.AppendData(buffer.Span[..n]);
            BytesObserved += n;
        }

        return n;
    }

    public override void Flush() => _inner.Flush();

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_leaveInnerOpen)
        {
            _inner.Dispose();
        }

        if (!_disposed)
        {
            try
            {
                if (_finalHash is null)
                {
                    // compute final hash so callers can still retrieve it after disposal
                    _finalHash = _hash.GetHashAndReset();
                }
            }
            catch
            {
                // ignore if hash cannot be computed
            }

            try
            {
                _hash.Dispose();
            }
            catch
            {
                // ignored
            }

            _disposed = true;
        }

        base.Dispose(disposing);
    }
}
