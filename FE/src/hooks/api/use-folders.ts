"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { folderService } from "@/services/folder-service";
import type {
  CreateFolderRequest,
  RenameFolderRequest,
} from "@/types/folder";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

export const folderQueryKeys = {
  all: ["folders"] as const,
  tree: (token?: string) => ["folders", "tree", token] as const,
};

export function useFolderTreeQuery(token?: string) {
  return useQuery({
    queryKey: folderQueryKeys.tree(token),
    queryFn: () => folderService.getTree(token),
    enabled: Boolean(token),
  });
}

export function useCreateFolderMutation(token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFolderRequest) =>
      folderService.create(payload, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: folderQueryKeys.all });
      toast.success("Đã tạo thư mục mới");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Tạo thư mục thất bại.";
      toast.error("Tạo thư mục thất bại", { description: msg });
    },
  });
}

export function useRenameFolderMutation(token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: RenameFolderRequest & { id: number }) =>
      folderService.rename(id, payload, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: folderQueryKeys.all });
      toast.success("Đã đổi tên thư mục");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Đổi tên thất bại.";
      toast.error("Đổi tên thất bại", { description: msg });
    },
  });
}

export function useDeleteFolderMutation(token?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => folderService.remove(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: folderQueryKeys.all });
      toast.success("Đã xóa thư mục");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Xóa thư mục thất bại.";
      toast.error("Xóa thư mục thất bại", { description: msg });
    },
  });
}
