import {
  apiUrl,
  apiFetch,
  apiUploadFormDataNdjson,
  type CloudUploadProgressEvent,
} from "@/lib/api-client";
import type {
  CloudFileDto,
  CloudFileSearchParams,
  MirrorUploadRequest,
  PagedResult,
} from "@/types/cloud-storage";

const BASE = "/v1/api/CloudStorage";
const thumbnailBlobCache = new Map<string, Blob>();
const thumbnailBlobInflight = new Map<string, Promise<Blob>>();

export const cloudStorageService = {
  search(
    params: CloudFileSearchParams,
    token?: string,
  ): Promise<PagedResult<CloudFileDto>> {
    return apiFetch<PagedResult<CloudFileDto>>(`${BASE}/search`, {
      method: "GET",
      query: params,
      token,
    });
  },

  mirror(payload: MirrorUploadRequest, token?: string): Promise<CloudFileDto> {
    return apiFetch<CloudFileDto>(`${BASE}/mirror`, {
      method: "POST",
      body: payload,
      token,
    });
  },

  upload(
    file: File,
    token?: string,
    folderId?: number | null,
    onProgress?: (ev: CloudUploadProgressEvent) => void,
  ): Promise<CloudFileDto> {
    const body = new FormData();
    body.append("file", file);
    let url = `${BASE}/upload`;
    if (folderId != null) {
      url += `?folderId=${folderId}`;
    }
    return apiUploadFormDataNdjson<CloudFileDto>(url, body, {
      token,
      onProgress,
    });
  },

  remove(id: number, token?: string): Promise<null> {
    return apiFetch<null>(`${BASE}/${id}`, {
      method: "DELETE",
      token,
    });
  },

  async fetchStreamBlob(id: number, token: string): Promise<Blob> {
    const res = await fetch(apiUrl(`${BASE}/${id}/stream`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.blob();
  },

  async fetchThumbnailBlob(id: number, token: string): Promise<Blob> {
    const key = `${id}:${token}`;
    const cached = thumbnailBlobCache.get(key);
    if (cached) {
      return cached;
    }

    const pending = thumbnailBlobInflight.get(key);
    if (pending) {
      return pending;
    }

    const req = (async () => {
      const res = await fetch(apiUrl(`${BASE}/${id}/thumbnail`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      thumbnailBlobCache.set(key, blob);
      return blob;
    })();

    thumbnailBlobInflight.set(key, req);
    try {
      return await req;
    } finally {
      thumbnailBlobInflight.delete(key);
    }
  },
};
