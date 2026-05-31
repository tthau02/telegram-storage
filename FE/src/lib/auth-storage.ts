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

const ROLE_CLAIM_URI =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return undefined;
    return JSON.parse(atob(parts[1])) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Decode JWT access token and extract role names (admin, staff, customer…). */
export function getRolesFromToken(): string[] {
  const token = getStoredAccessToken();
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  const raw = payload[ROLE_CLAIM_URI];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return [raw];
  return [];
}

/** Map role names to permission keys for sidebar / route guards. */
export function getPermissionsFromRoles(roles: string[]): string[] {
  const lower = new Set(roles.map((r) => r.toLowerCase()));
  if (lower.has("admin")) return ["users.read"];
  return [];
}
