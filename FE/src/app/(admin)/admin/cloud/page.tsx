"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  File,
  FileImage,
  FileVideo,
  Link2,
  Play,
  Trash2,
  Upload,
} from "lucide-react";

import {
  CommonHeader,
  CommonTable,
  CommonTableFilter,
  type CommonHeaderProps,
  type CommonTableAction,
  type CommonTableColumn,
  type SortDirection,
  type TableFilterField,
  type TableFilterValues,
} from "@/components/shared/common";
import {
  useCloudFilesQuery,
  useDeleteCloudFileMutation,
  useUploadCloudFileMutation,
} from "@/hooks/api";
import { FixedBottomLoadProgress } from "@/components/shared/load-progress";
import { ApiError } from "@/lib/api-client";
import { cloudStorageService } from "@/services/cloud-storage-service";
import type {
  CloudFileDto,
  CloudFileSearchParams,
} from "@/types/cloud-storage";
import { toast } from "sonner";
import { formatFileSizeBytes } from "@/lib/format-file-size";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { MirrorUploadDialog } from "./mirror-upload-dialog";
import { StreamFileDialog } from "./stream-file-dialog";

type CloudFileRow = CloudFileDto;

const TOKEN_KEYS = ["accessToken", "token", "authToken"] as const;

function getStoredToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseOptionalLong(v: unknown): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function fileKind(mime: string): "image" | "video" | "pdf" | "other" {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf") return "pdf";
  return "other";
}

function fileExtensionLabel(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "FILE";
  return fileName
    .slice(dot + 1)
    .toUpperCase()
    .slice(0, 6);
}

function ThumbnailCell({ row, token }: { row: CloudFileRow; token?: string }) {
  const kind = fileKind(row.mimeType);
  const [thumbnailBlobUrl, setThumbnailBlobUrl] = useState<string | null>(null);
  const [useExtensionTile, setUseExtensionTile] = useState(false);

  useEffect(() => {
    if (!token || !row.thumbnailFileId) {
      setThumbnailBlobUrl(null);
      setUseExtensionTile(false);
      return;
    }

    const ac = new AbortController();
    let localUrl: string | null = null;
    (async () => {
      try {
        const blob = await cloudStorageService.fetchThumbnailBlob(
          row.id,
          token,
        );
        if (ac.signal.aborted) return;
        // Ảnh fallback mặc định hiện rất nhỏ (~700 bytes); hiển thị tile theo đuôi file thay vì ảnh mẫu.
        if (blob.size > 0 && blob.size < 2000) {
          setUseExtensionTile(true);
          setThumbnailBlobUrl(null);
          return;
        }
        setUseExtensionTile(false);
        localUrl = URL.createObjectURL(blob);
        if (!ac.signal.aborted) {
          setThumbnailBlobUrl(localUrl);
        } else {
          URL.revokeObjectURL(localUrl);
        }
      } catch {
        setUseExtensionTile(false);
        setThumbnailBlobUrl(null);
      }
    })();

    return () => {
      ac.abort();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [row.id, row.thumbnailFileId, token]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-20 overflow-hidden rounded-md border border-border bg-muted/40">
        {thumbnailBlobUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL được tạo từ API có auth */}
            <img
              src={thumbnailBlobUrl}
              alt={`Thumbnail ${row.fileName}`}
              className="h-full w-full object-cover"
            />
          </>
        ) : useExtensionTile ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted text-[10px] font-semibold tracking-wide text-black">
            <File className="mb-0.5 size-3.5" aria-hidden />
            <span>{fileExtensionLabel(row.fileName)}</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {kind === "image" ? (
              <FileImage className="size-5" aria-hidden />
            ) : kind === "video" ? (
              <FileVideo className="size-5" aria-hidden />
            ) : (
              <File className="size-5" aria-hidden />
            )}
          </div>
        )}
      </div>
      <span className="line-clamp-2">{row.fileName}</span>
    </div>
  );
}

export default function AdminCloudPage() {
  const defaultFilterValues: TableFilterValues = {
    fileName: "",
    mimeType: "",
    sourceUrl: "",
    minFileSize: "",
    maxFileSize: "",
    createdRange: undefined as { from?: string; to?: string } | undefined,
  };

  const [filterValues, setFilterValues] = useState<TableFilterValues>(() => ({
    ...defaultFilterValues,
  }));
  const [sortKey, setSortKey] = useState<string | null>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(
    "desc",
  );
  const [token] = useState<string | undefined>(() => getStoredToken());
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);
  const [streamTarget, setStreamTarget] = useState<CloudFileDto | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    fileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createdRange = filterValues.createdRange as
    | { from?: string; to?: string }
    | undefined;

  const queryParams = useMemo<CloudFileSearchParams>(() => {
    return {
      page: 1,
      pageSize: 200,
      sortBy: sortKey ?? "createdAt",
      isDesc: sortDirection !== "asc",
      fileName: String(filterValues.fileName ?? "").trim() || undefined,
      mimeType: String(filterValues.mimeType ?? "").trim() || undefined,
      sourceUrl: String(filterValues.sourceUrl ?? "").trim() || undefined,
      minFileSize: parseOptionalLong(filterValues.minFileSize),
      maxFileSize: parseOptionalLong(filterValues.maxFileSize),
      createdFrom: createdRange?.from || undefined,
      createdTo: createdRange?.to || undefined,
    };
  }, [
    sortKey,
    sortDirection,
    filterValues,
    createdRange?.from,
    createdRange?.to,
  ]);

  const filesQuery = useCloudFilesQuery(queryParams, token, {
    enabled: Boolean(token),
  });

  const deleteMutation = useDeleteCloudFileMutation(token);
  const uploadMutation = useUploadCloudFileMutation(token);

  const rows = useMemo<CloudFileRow[]>(
    () => filesQuery.data?.items ?? [],
    [filesQuery.data?.items],
  );

  const openStream = (row: CloudFileRow) => {
    setStreamTarget(row);
    setStreamOpen(true);
  };

  const columns: CommonTableColumn<CloudFileRow>[] = [
    {
      id: "fileName",
      label: "Tệp",
      type: "text",
      sortable: true,
      renderCell: (row) => <ThumbnailCell row={row} token={token} />,
    },
    { id: "createdAt", label: "Ngày upload", type: "datetime", sortable: true },
    { id: "mimeType", label: "Kiểu file", type: "text", sortable: true },
    {
      id: "fileSize",
      label: "Kích thước",
      type: "text",
      sortable: true,
      renderCell: (row) => formatFileSizeBytes(row.fileSize),
    },
  ];

  const filterFields: TableFilterField[] = [
    {
      type: "input",
      id: "fileName",
      label: "Tên file",
      placeholder: "Nhập tên file",
    },
    {
      type: "daterange",
      id: "createdRange",
      label: "Ngày upload",
      placeholder: "Chọn khoảng thời gian",
      numberOfMonths: 2,
    },
  ];

  const pageHeader: CommonHeaderProps = useMemo(
    () => ({
      title: "Kho file Telegram",
      subtitle: "file đã lưu trên Telegram",
      actions: [
        {
          id: "upload",
          label: uploadMutation.isPending ? "Đang tải lên…" : "Tải lên",
          icon: <Upload className="size-3.5" aria-hidden />,
          variant: "outline",
          disabled: uploadMutation.isPending,
          onClick: () => fileInputRef.current?.click(),
        },
        {
          id: "mirror",
          label: "Lấy từ URL",
          icon: <Link2 className="size-3.5" aria-hidden />,
          variant: "outline",
          onClick: () => setMirrorOpen(true),
        },
      ],
    }),
    [uploadMutation.isPending],
  );

  const actions: CommonTableAction<CloudFileRow>[] = [
    {
      id: "stream",
      label: "Xem / phát",
      icon: <Play className="size-3.5" aria-hidden />,
      variant: "outline",
      onClick: (row) => openStream(row),
    },
    {
      id: "delete",
      label: "Xóa",
      icon: <Trash2 className="size-3.5" aria-hidden />,
      variant: "destructive",
      onClick: (row) =>
        token && setPendingDelete({ id: row.id, fileName: row.fileName }),
    },
  ];

  const loadError =
    filesQuery.error instanceof ApiError
      ? filesQuery.error.message
      : filesQuery.error
        ? "Không thể tải danh sách file."
        : null;

  useEffect(() => {
    if (!loadError) return;
    toast.error("Không tải được danh sách file", {
      id: "admin-cloud-load-error",
      description: loadError,
      duration: 10_000,
    });
  }, [loadError]);

  const handleUploadPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !token || uploadMutation.isPending) return;
    setUploadPercent(0);
    uploadMutation.mutate(
      {
        file: f,
        onProgress: (ev) => {
          // ~35% giai đoạn browser → API, ~65% giai đoạn Telegram (SaveBigFilePart).
          if (ev.phase === "http") {
            setUploadPercent(Math.round((ev.percent / 100) * 35));
          } else {
            setUploadPercent(Math.round(35 + (ev.percent / 100) * 65));
          }
        },
      },
      {
        onSettled: () => setUploadPercent(null),
        onSuccess: (dto) => {
          toast.success("Đã tải lên", { description: dto.fileName });
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Tải lên thất bại.";
          toast.error("Tải lên thất bại", { description: message });
        },
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUploadPick}
      />

      <CommonHeader {...pageHeader} />

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
        <aside className="shrink-0 lg:w-72 lg:max-h-[min(100dvh,920px)] lg:overflow-y-auto xl:w-80">
          <CommonTableFilter
            fields={filterFields}
            values={filterValues}
            onChange={setFilterValues}
            onReset={() => {
              setFilterValues({ ...defaultFilterValues });
            }}
            onSubmit={() => {
              void filesQuery.refetch();
            }}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <CommonTable<CloudFileRow>
            embed
            title=""
            columns={columns}
            data={rows}
            getRowKey={(row) => String(row.id)}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key, direction) => {
              setSortKey(key);
              setSortDirection(direction);
            }}
            actions={actions}
            emptyMessage={
              filesQuery.isLoading ? "Đang tải dữ liệu…" : "Không có dữ liệu."
            }
          />
        </div>
      </div>

      <MirrorUploadDialog
        open={mirrorOpen}
        onOpenChange={setMirrorOpen}
        token={token}
      />

      <StreamFileDialog
        open={streamOpen}
        onOpenChange={(o) => {
          setStreamOpen(o);
          if (!o) setStreamTarget(null);
        }}
        file={streamTarget}
        token={token}
      />

      <FixedBottomLoadProgress
        show={uploadMutation.isPending}
        label="Tải lên"
        value={uploadPercent ?? 0}
        showPercent
      />

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Xóa file khỏi kho?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa tệp <strong>{pendingDelete?.fileName}</strong>{" "}
            khỏi kho?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (!pendingDelete || !token) return;
                const { id, fileName } = pendingDelete;
                deleteMutation.mutate(id, {
                  onSuccess: () =>
                    toast.success("Đã xóa file", { description: fileName }),
                  onError: (err) =>
                    toast.error("Xóa thất bại", {
                      description:
                        err instanceof ApiError
                          ? err.message
                          : "Không thể xóa.",
                    }),
                });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
