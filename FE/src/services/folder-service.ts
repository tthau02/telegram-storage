import { apiFetch } from "@/lib/api-client";
import type {
  FolderDto,
  CreateFolderRequest,
  RenameFolderRequest,
} from "@/types/folder";

const BASE = "/v1/api/Folders";

export const folderService = {
  getTree(token?: string): Promise<FolderDto[]> {
    return apiFetch<FolderDto[]>(`${BASE}/tree`, { method: "GET", token });
  },

  create(payload: CreateFolderRequest, token?: string): Promise<FolderDto> {
    return apiFetch<FolderDto>(BASE, {
      method: "POST",
      body: payload,
      token,
    });
  },

  rename(
    id: number,
    payload: RenameFolderRequest,
    token?: string,
  ): Promise<FolderDto> {
    return apiFetch<FolderDto>(`${BASE}/${id}`, {
      method: "PUT",
      body: payload,
      token,
    });
  },

  remove(id: number, token?: string): Promise<null> {
    return apiFetch<null>(`${BASE}/${id}`, { method: "DELETE", token });
  },
};
