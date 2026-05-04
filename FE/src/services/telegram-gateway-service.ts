import { apiFetch } from "@/lib/api-client";

const BASE = "/v1/api/TelegramGateway";

export type TelegramLoginSessionStatus = {
  completed: boolean;
  waitingFor?: string | null;
  error?: string | null;
};

export type TelegramStartLoginOptions = {
  /** Bỏ trống → server dùng Telegram:PhoneNumber trong appsettings */
  phoneNumber?: string;
  token?: string;
};

export const telegramGatewayService = {
  startLogin(options: TelegramStartLoginOptions): Promise<{ sessionId: string }> {
    const { phoneNumber, token } = options;
    const trimmed = phoneNumber?.trim();
    const body = trimmed ? { phoneNumber: trimmed } : {};
    return apiFetch<{ sessionId: string }>(`${BASE}/login/sessions`, {
      method: "POST",
      body,
      token,
    });
  },

  getSession(
    sessionId: string,
    token?: string,
  ): Promise<TelegramLoginSessionStatus> {
    return apiFetch<TelegramLoginSessionStatus>(
      `${BASE}/login/sessions/${sessionId}`,
      {
        method: "GET",
        token,
      },
    );
  },

  submitCredential(
    sessionId: string,
    value: string,
    token?: string,
  ): Promise<null> {
    return apiFetch<null>(
      `${BASE}/login/sessions/${sessionId}/credential`,
      {
        method: "POST",
        body: { value },
        token,
      },
    );
  },
};
