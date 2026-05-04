using System.Collections.Concurrent;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TelegramStorage.Application.DTOs.Storage;
using TelegramStorage.Application.DTOs.Telegram;
using TelegramStorage.Application.Options;
using TL;
using WTelegram;

namespace TelegramStorage.Infrastructure.Services;

/// <summary>Single MTProto client, serialized operations, session file on disk.</summary>
public sealed class TelegramMtProtoExecutor : IAsyncDisposable
{
    /// <summary>MTProto upload.getFile: limit must be a multiple of this value (Telegram API).</summary>
    private const int MtProtoFileBlock = 4096;

    /// <summary>MTProto upload.getFile: limit must not exceed 1 MiB.</summary>
    private const int MtProtoMaxFileLimit = 1048576;

    private readonly IOptionsMonitor<TelegramOptions> _options;
    private readonly IHostEnvironment _env;
    private readonly ILogger<TelegramMtProtoExecutor> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly ConcurrentDictionary<Guid, LoginSession> _loginSessions = new();

    private WTelegram.Client? _client;
    private Channel? _targetChannel;

    public TelegramMtProtoExecutor(
        IOptionsMonitor<TelegramOptions> options,
        IHostEnvironment env,
        ILogger<TelegramMtProtoExecutor> logger)
    {
        _options = options;
        _env = env;
        _logger = logger;
    }

    private string SessionFullPath =>
        Path.GetFullPath(
            Path.Combine(_env.ContentRootPath, _options.CurrentValue.SessionPath ?? "telegram.session"));

    private string? Config(string what) => what switch
    {
        "api_id" => _options.CurrentValue.ApiId.ToString(),
        "api_hash" => _options.CurrentValue.ApiHash,
        "bot_token" => string.IsNullOrWhiteSpace(_options.CurrentValue.Token) ? null : _options.CurrentValue.Token,
        "session_pathname" => SessionFullPath,
        "phone_number" => string.IsNullOrWhiteSpace(_options.CurrentValue.PhoneNumber)
            ? null
            : _options.CurrentValue.PhoneNumber.Trim(),
        _ => null,
    };

    public Task<Guid> StartLoginAsync(string phoneNumber, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            throw new ArgumentException("Phone number is required.", nameof(phoneNumber));
        }

        if (_client?.User != null)
        {
            throw new InvalidOperationException("Telegram session is already active.");
        }

        if (_loginSessions.Values.Any(s => !s.Completed && s.Fault is null))
        {
            throw new InvalidOperationException("A Telegram login flow is already in progress.");
        }

        foreach (var key in _loginSessions.Keys.ToArray())
        {
            if (_loginSessions.TryGetValue(key, out var old) && (old.Completed || old.Fault is not null))
            {
                _loginSessions.TryRemove(key, out _);
            }
        }

        var session = new LoginSession(new WTelegram.Client(Config));
        if (!_loginSessions.TryAdd(session.Id, session))
        {
            throw new InvalidOperationException("Could not start login session.");
        }

        var phone = phoneNumber.Trim();
        session.Worker = RunLoginWorkerAsync(session, phone, cancellationToken);
        return Task.FromResult(session.Id);
    }

    public Task<TelegramLoginSessionStatusDto?> GetLoginSessionAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        if (!_loginSessions.TryGetValue(sessionId, out var session))
        {
            return Task.FromResult<TelegramLoginSessionStatusDto?>(null);
        }

        if (session.Fault is not null)
        {
            return Task.FromResult<TelegramLoginSessionStatusDto?>(
                new TelegramLoginSessionStatusDto
                {
                    Error = session.Fault.Message,
                    Completed = false,
                });
        }

        if (session.Completed)
        {
            return Task.FromResult<TelegramLoginSessionStatusDto?>(
                new TelegramLoginSessionStatusDto
                {
                    Completed = true,
                });
        }

        return Task.FromResult<TelegramLoginSessionStatusDto?>(
            new TelegramLoginSessionStatusDto
            {
                WaitingFor = session.WaitingFor,
            });
    }

    public Task SubmitLoginCredentialAsync(Guid sessionId, string value, CancellationToken cancellationToken = default)
    {
        if (!_loginSessions.TryGetValue(sessionId, out var session))
        {
            throw new InvalidOperationException("Login session was not found.");
        }

        if (session.Completed || session.Fault is not null)
        {
            throw new InvalidOperationException("Login session is no longer active.");
        }

        if (session.Credential is null)
        {
            throw new InvalidOperationException("Telegram is not waiting for a credential at this moment.");
        }

        if (!session.Credential.TrySetResult((value ?? string.Empty).Trim()))
        {
            throw new InvalidOperationException("Could not submit credential.");
        }

        return Task.CompletedTask;
    }

    public async Task EnsureOperationalAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_loginSessions.Values.Any(s => !s.Completed && s.Fault is null))
            {
                throw new InvalidOperationException("Finish the Telegram login flow before using cloud storage.");
            }

            if (_client?.User is not null)
            {
                return;
            }

            _client = new WTelegram.Client(Config);
            await _client.LoginUserIfNeeded().ConfigureAwait(false);
            _targetChannel = null;
            _logger.LogInformation("Telegram MTProto session loaded from {Session}", SessionFullPath);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<int> UploadAndSendDocumentAsync(
        Stream content,
        string fileName,
        string mimeType,
        IProgress<TelegramUploadProgress>? uploadProgress = null,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await EnsureClientReadyUnlockedAsync(cancellationToken).ConfigureAwait(false);
            var client = _client!;
            Client.ProgressCallback? progressHandler = uploadProgress is null
                ? null
                : (transmitted, totalSize) =>
                    uploadProgress.Report(new TelegramUploadProgress(transmitted, totalSize));

            // encapsulate upload/send so we can retry after resetting client on transient TL errors
            async Task<int> doUploadAsync(WTelegram.Client c)
            {
                var ch = await GetTargetChannelAsync(c, cancellationToken).ConfigureAwait(false);
                var inputFile = await c.UploadFileAsync(content, fileName, progressHandler).ConfigureAwait(false);
                var attrs = new DocumentAttribute[] { new DocumentAttributeFilename { file_name = fileName } };
                var media = new InputMediaUploadedDocument(inputFile, mimeType, attrs);
                InputPeer peer = (InputPeer)ch;
                var sent = await c.SendMessageAsync(peer, fileName, media).ConfigureAwait(false);
                return sent.id;
            }

            try
            {
                return await doUploadAsync(client).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex.GetType().Name == "TL.RpcException" || ex.Message?.Contains("BadMsgNotification") == true || ex.GetType().Name == "WTException")
            {
                _logger.LogWarning(ex, "Telegram upload failed with transient error; refreshing client and retrying once.");
                try
                {
                    await client.DisposeAsync().ConfigureAwait(false);
                }
                catch
                {
                    // ignored
                }

                // Reset client and retry once
                _client = null;
                await EnsureClientReadyUnlockedAsync(cancellationToken).ConfigureAwait(false);
                var retryClient = _client!;
                return await doUploadAsync(retryClient).ConfigureAwait(false);
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<(InputFileLocationBase Location, long FileSize)> GetDocumentFileAsync(
        int telegramMessageId,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await EnsureClientReadyUnlockedAsync(cancellationToken).ConfigureAwait(false);
            var client = _client!;
            var channel = await GetTargetChannelAsync(client, cancellationToken).ConfigureAwait(false);

            var inputChannel = (InputChannel)channel;
            var batch = await client
                .Channels_GetMessages(inputChannel, new InputMessage[] { new InputMessageID { id = telegramMessageId } })
                .ConfigureAwait(false);

            var msg = batch.Messages.OfType<Message>().FirstOrDefault()
                      ?? throw new InvalidOperationException($"Message {telegramMessageId} was not found in the channel.");

            if (msg.media is not MessageMediaDocument media || media.document is not Document doc)
            {
                throw new InvalidOperationException("That message does not contain a document/file.");
            }

            var loc = doc.ToFileLocation();
            if (loc is not InputFileLocationBase fileLoc)
            {
                throw new InvalidOperationException("Could not resolve file location for that document.");
            }

            return (fileLoc, doc.size);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task CopyFileBytesAsync(
        InputFileLocationBase location,
        long offset,
        long length,
        Stream destination,
        bool precise,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await EnsureClientReadyUnlockedAsync(cancellationToken).ConfigureAwait(false);
            var client = _client!;

            var remaining = length;
            var pos = offset;
            long written = 0;
            while (remaining > 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var cap = Math.Min(remaining, MtProtoMaxFileLimit);
                var chunk = (int)(cap / MtProtoFileBlock * MtProtoFileBlock);
                if (chunk == 0)
                {
                    chunk = MtProtoFileBlock;
                }

                var part = await client
                    .Upload_GetFile(location, pos, chunk, precise: precise, cdn_supported: false)
                    .ConfigureAwait(false);

                if (part is not Upload_File uf)
                {
                    throw new InvalidOperationException($"Unexpected upload.getFile payload: {part?.GetType().Name}");
                }

                if (uf.bytes is null || uf.bytes.Length == 0)
                {
                    throw new EndOfStreamException(
                        $"Telegram returned EOF before expected length. offset={offset}, requested={length}, written={written}, pos={pos}.");
                }

                var n = (int)Math.Min(uf.bytes.Length, remaining);
                if (n == 0)
                {
                    throw new EndOfStreamException(
                        $"Telegram returned no usable bytes for this range. offset={offset}, requested={length}, written={written}, pos={pos}.");
                }

                await destination.WriteAsync(uf.bytes.AsMemory(0, n), cancellationToken).ConfigureAwait(false);
                pos += uf.bytes.Length;
                remaining -= n;
                written += n;
            }

            if (written != length)
            {
                throw new EndOfStreamException(
                    $"Telegram stream length mismatch. offset={offset}, requested={length}, written={written}.");
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task DeleteChannelMessagesAsync(int[] messageIds, CancellationToken cancellationToken = default)
    {
        if (messageIds.Length == 0)
        {
            return;
        }

        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await EnsureClientReadyUnlockedAsync(cancellationToken).ConfigureAwait(false);
            var client = _client!;
            var channel = await GetTargetChannelAsync(client, cancellationToken).ConfigureAwait(false);
            var inputChannel = (InputChannel)channel;
            await client.Channels_DeleteMessages(inputChannel, messageIds).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task EnsureClientReadyUnlockedAsync(CancellationToken cancellationToken)
    {
        if (_loginSessions.Values.Any(s => !s.Completed && s.Fault is null))
        {
            throw new InvalidOperationException("Finish the Telegram login flow before using cloud storage.");
        }

        if (_client?.User is not null)
        {
            return;
        }

        _client = new WTelegram.Client(Config);
        await _client.LoginUserIfNeeded().ConfigureAwait(false);
        _targetChannel = null;
    }

    private async Task<Channel> GetTargetChannelAsync(WTelegram.Client client, CancellationToken cancellationToken)
    {
        if (_targetChannel is not null)
        {
            return _targetChannel;
        }

        var id = _options.CurrentValue.TargetChannelId
                 ?? throw new InvalidOperationException("Configure Telegram:TargetChannelId (see WTelegramClient README for chat id keys).");

        var chats = await client.Messages_GetAllChats().ConfigureAwait(false);
        if (chats.chats.TryGetValue(id, out var chat) && chat is Channel ch)
        {
            _targetChannel = ch;
            return _targetChannel;
        }

        // Try to locate channel by inspecting returned chats in a few resilient ways.
        var idAbs = Math.Abs(id);
        foreach (var maybe in chats.chats.Values.OfType<Channel>())
        {
            try
            {
                var cid = (long)maybe.id; // channel id may be int in TL definition
                if (cid == id || cid == idAbs)
                {
                    _targetChannel = maybe;
                    return _targetChannel;
                }

                var sId = id.ToString();
                var sCid = cid.ToString();
                if (sId.EndsWith(sCid, StringComparison.Ordinal) || sCid.EndsWith(sId, StringComparison.Ordinal))
                {
                    _targetChannel = maybe;
                    return _targetChannel;
                }
            }
            catch
            {
                // ignore individual parse errors and continue
            }
        }

        // Not found: log available chats for troubleshooting and throw.
        var available = string.Join(", ", chats.chats.Keys.Take(20));
        _logger.LogWarning("Target channel {TargetId} not found. Available chat keys (sample): {Available}", id, available);
        throw new InvalidOperationException(
            $"Target channel/chat {id} not found for this user. Join it with the Telegram account used by this API.");
    }

    private async Task RunLoginWorkerAsync(LoginSession session, string phone, CancellationToken ct)
    {
        try
        {
            string? loginInfo = phone;
            while (session.Client.User is null && !ct.IsCancellationRequested)
            {
                var need = await session.Client.Login(loginInfo).ConfigureAwait(false);
                if (need is null)
                {
                    loginInfo = null;
                    continue;
                }

                switch (need)
                {
                    case "verification_code":
                    case "phone_code":
                    case "password":
                    case "email_verification_code":
                    {
                        var tcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
                        session.Credential = tcs;
                        session.WaitingFor = need;
                        loginInfo = await tcs.Task.WaitAsync(ct).ConfigureAwait(false);
                        session.WaitingFor = null;
                        session.Credential = null;
                        break;
                    }
                    case "name":
                        loginInfo = "Cloud Dashboard User";
                        break;
                    default:
                        loginInfo = null;
                        break;
                }
            }

            await _gate.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                _client = session.Client;
                _targetChannel = null;
            }
            finally
            {
                _gate.Release();
            }

            session.Completed = true;
            _logger.LogInformation("Telegram user login completed.");
        }
        catch (Exception ex)
        {
            session.Fault = ex;
            _logger.LogError(ex, "Telegram login failed.");
            _loginSessions.TryRemove(session.Id, out _);
            try
            {
                await session.Client.DisposeAsync().ConfigureAwait(false);
            }
            catch
            {
                // ignored
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var kv in _loginSessions.ToArray())
        {
            if (!ReferenceEquals(kv.Value.Client, _client))
            {
                try
                {
                    await kv.Value.Client.DisposeAsync().ConfigureAwait(false);
                }
                catch
                {
                    // ignored
                }
            }
        }

        _loginSessions.Clear();

        if (_client is not null)
        {
            await _client.DisposeAsync().ConfigureAwait(false);
            _client = null;
        }

        _gate.Dispose();
    }

    private sealed class LoginSession
    {
        public LoginSession(WTelegram.Client client) => Client = client;

        public Guid Id { get; } = Guid.NewGuid();
        public WTelegram.Client Client { get; }
        public string? WaitingFor { get; set; }
        public TaskCompletionSource<string>? Credential { get; set; }
        public Task? Worker { get; set; }
        public Exception? Fault { get; set; }
        public bool Completed { get; set; }
    }
}
