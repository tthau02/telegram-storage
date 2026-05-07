function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (raw) return raw.replace(/\/$/, "");
  // Relative paths hit the Next origin (e.g. :3000); default BE dev port when env missing.
  if (process.env.NODE_ENV === "development") return "http://localhost:8080";
  return "";
}

const base = resolveApiBase();

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
  statusCode: number;
};

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: QueryParams;
  token?: string;
};

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function appendQuery(path: string, query?: QueryParams): string {
  if (!query) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  const { body, query, token, headers, ...rest } = init ?? {};
  const finalPath = appendQuery(path, query);

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(apiUrl(finalPath), {
    ...rest,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson
    ? ((await res.json()) as ApiEnvelope<T> | T)
    : undefined;

  if (!res.ok) {
    if (payload && typeof payload === "object" && "statusCode" in payload) {
      const envelope = payload as ApiEnvelope<T>;
      throw new ApiError(
        envelope.message ?? `API ${res.status}: ${res.statusText}`,
        envelope.statusCode ?? res.status,
        envelope.errors ?? undefined,
      );
    }
    throw new ApiError(`API ${res.status}: ${res.statusText}`, res.status);
  }

  if (payload && typeof payload === "object" && "statusCode" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new ApiError(
        envelope.message ?? "Yêu cầu không thành công.",
        envelope.statusCode,
        envelope.errors ?? undefined,
      );
    }
    return envelope.data as T;
  }

  return payload as T;
}

/** Header gửi kèm để BE trả tiến độ Telegram (NDJSON). Khớp `CloudStorageController.NdjsonUploadProgressHeader`. */
export const NDJSON_UPLOAD_PROGRESS_HEADER = "X-Ndjson-Upload-Progress";

export type CloudUploadProgressEvent =
  | { phase: "http"; percent: number }
  | { phase: "telegram"; percent: number };

/**
 * Upload FormData: tiến độ HTTP (xhr.upload) + tiến độ MTProto (dòng NDJSON `telegram`).
 */
export function apiUploadFormDataNdjson<T>(
  path: string,
  formData: FormData,
  init?: {
    token?: string;
    onProgress?: (ev: CloudUploadProgressEvent) => void;
  },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.responseType = "text";
    if (init?.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${init.token}`);
    }
    xhr.setRequestHeader(NDJSON_UPLOAD_PROGRESS_HEADER, "1");

    let lineCursor = 0;
    let lastComplete: T | undefined;
    let finished = false;

    const drainNdjson = () => {
      const text = xhr.responseText;
      while (lineCursor < text.length) {
        const nl = text.indexOf("\n", lineCursor);
        if (nl === -1) break;
        const line = text.slice(lineCursor, nl).trim();
        lineCursor = nl + 1;
        if (!line) continue;

        let ev: {
          stage: string;
          transmitted?: number;
          total?: number;
          data?: T;
          message?: string;
        };
        try {
          ev = JSON.parse(line) as typeof ev;
        } catch {
          continue;
        }

        if (ev.stage === "telegram" && init?.onProgress) {
          const total = ev.total ?? 0;
          const tr = ev.transmitted ?? 0;
          const pct =
            total > 0
              ? Math.min(100, Math.max(0, Math.round((100 * tr) / total)))
              : 0;
          init.onProgress({ phase: "telegram", percent: pct });
        }

        if (ev.stage === "complete" && ev.data !== undefined) {
          lastComplete = ev.data;
        }

        if (ev.stage === "error") {
          throw new ApiError(ev.message ?? "Tải lên thất bại.", 400);
        }
      }
    };

    const fail = (err: unknown) => {
      if (finished) return;
      finished = true;
      reject(err);
    };

    const ok = (value: T) => {
      if (finished) return;
      finished = true;
      resolve(value);
    };

    xhr.upload.addEventListener("loadstart", () => {
      init?.onProgress?.({ phase: "http", percent: 1 });
    });

    xhr.upload.addEventListener("progress", (ev) => {
      if (!init?.onProgress || !ev.lengthComputable) return;
      const pct = Math.min(
        100,
        Math.max(0, Math.round((100 * ev.loaded) / Math.max(1, ev.total))),
      );
      init.onProgress({ phase: "http", percent: pct });
    });

    xhr.addEventListener("progress", () => {
      try {
        drainNdjson();
      } catch (e) {
        fail(e);
      }
    });

    xhr.addEventListener("load", () => {
      if (finished) return;
      if (xhr.status < 200 || xhr.status >= 300) {
        fail(
          new ApiError(xhr.statusText || `HTTP ${xhr.status}`, xhr.status),
        );
        return;
      }
      try {
        drainNdjson();
        if (lastComplete !== undefined) {
          ok(lastComplete);
          return;
        }
        fail(new ApiError("Phản hồi upload không hợp lệ (thiếu complete).", xhr.status));
      } catch (e) {
        fail(e);
      }
    });

    xhr.addEventListener("error", () => {
      fail(new ApiError("Lỗi mạng khi tải lên.", 0));
    });

    xhr.addEventListener("abort", () => {
      fail(new ApiError("Đã huỷ tải lên.", 0));
    });

    xhr.send(formData);
  });
}
