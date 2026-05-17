/** Khớp với login-view — một nơi dùng cho guard / đăng xuất. */

export const AUTH_ACCESS_TOKEN_KEY = "accessToken";
export const AUTH_TOKEN_EXPIRY_KEY = "tokenExpiresAtUtc";
export const AUTH_USER_KEY = "authUser";

export type StoredUser = {
  userName: string;
  fullName: string;
  avatar?: string | null;
};

export function getStoredAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of ["accessToken", "token", "authToken"] as const) {
    const value = localStorage.getItem(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
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
