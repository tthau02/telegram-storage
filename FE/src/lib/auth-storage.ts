/** Khớp với login-view — một nơi dùng cho guard / đăng xuất. */

export const AUTH_ACCESS_TOKEN_KEY = "accessToken";
export const AUTH_TOKEN_EXPIRY_KEY = "tokenExpiresAtUtc";

export function getStoredAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of ["accessToken", "token", "authToken"] as const) {
    const value = localStorage.getItem(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
}

/** true khi đã có thời điểm hết hạn và hiện tại >= hết hạn */
export function isAuthExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(AUTH_TOKEN_EXPIRY_KEY)?.trim();
  if (!raw) return false;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return false;
  return Date.now() >= ms;
}
