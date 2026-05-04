namespace TelegramStorage.Application.DTOs.Storage;

/// <summary>Từ WTelegram <c>UploadFileAsync</c> (SaveFilePart / SaveBigFilePart).</summary>
public readonly record struct TelegramUploadProgress(long TransmittedBytes, long TotalBytes);
