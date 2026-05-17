"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { cloudStorageService } from "@/services/cloud-storage-service";
import type { CloudUploadProgressEvent } from "@/lib/api-client";
import type {
  CloudFileDto,
  CloudFileSearchParams,
  MirrorUploadRequest,
  PagedResult,
} from "@/types/cloud-storage";

type CloudFilesQueryOptions = Omit<
  UseQueryOptions<PagedResult<CloudFileDto>>,
  "queryKey" | "queryFn"
>;

export function useCloudFilesQuery(
  params: CloudFileSearchParams,
  token?: string,
  options?: CloudFilesQueryOptions,
) {
  return useQuery({
    queryKey: queryKeys.cloudFiles.list(params),
    queryFn: () => cloudStorageService.search(params, token),
    ...options,
  });
}

export function useMirrorCloudFileMutation(token?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MirrorUploadRequest) =>
      cloudStorageService.mirror(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudFiles.all });
    },
  });
}

export function useUploadCloudFileMutation(token?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      file: File;
      folderId?: number | null;
      onProgress?: (ev: CloudUploadProgressEvent) => void;
    }) => cloudStorageService.upload(vars.file, token, vars.folderId, vars.onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudFiles.all });
    },
  });
}

export function useDeleteCloudFileMutation(token?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cloudStorageService.remove(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudFiles.all });
    },
  });
}
