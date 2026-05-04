namespace TelegramStorage.Http;

internal static class HttpRangeHelper
{
    /// <summary>Parses a single <c>bytes=</c> range. Returns false if header is missing or invalid.</summary>
    public static bool TryParseSingleRange(string? rangeHeader, long totalLength, out long start, out long end)
    {
        start = 0;
        end = Math.Max(0, totalLength - 1);

        if (string.IsNullOrWhiteSpace(rangeHeader)
            || totalLength < 0
            || !rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var part = rangeHeader.AsSpan()["bytes=".Length..].Trim();
        var dash = part.IndexOf('-');
        if (dash < 0)
        {
            return false;
        }

        var startPart = part[..dash].Trim();
        var endPart = part[(dash + 1)..].Trim();

        if (startPart.IsEmpty && !endPart.IsEmpty)
        {
            if (!long.TryParse(endPart, out var suffix))
            {
                return false;
            }

            start = Math.Max(0, totalLength - suffix);
            end = totalLength - 1;
            return start <= end;
        }

        if (!long.TryParse(startPart, out var from))
        {
            return false;
        }

        start = from;
        if (endPart.IsEmpty)
        {
            end = totalLength - 1;
        }
        else if (!long.TryParse(endPart, out var to))
        {
            return false;
        }
        else
        {
            end = to;
        }

        if (start < 0 || end < start || start >= totalLength)
        {
            return false;
        }

        end = Math.Min(end, totalLength - 1);
        return true;
    }
}
