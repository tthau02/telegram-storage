/** Định dạng kích thước byte → B, KB, MB, GB, TB (hệ 1024). */
export function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }

  const maxFrac = i === 0 ? 0 : n >= 100 ? 0 : n >= 10 ? 1 : 2;
  const formatted = n.toLocaleString("vi-VN", {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0,
  });
  return `${formatted} ${units[i]}`;
}
