import {
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
    onProgress?: (ev: CloudUploadProgressEvent) => void,
  ): Promise<CloudFileDto> {
    const body = new FormData();
    body.append("file", file);
    return apiUploadFormDataNdjson<CloudFileDto>(`${BASE}/upload`, body, {
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
};
