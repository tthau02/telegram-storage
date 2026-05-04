"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Play, Trash2, Upload } from "lucide-react";

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
    { id: "fileName", label: "Tên file", type: "text", sortable: true },
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
      title: "Lưu trữ cloud",
      subtitle: "danh sách",
      actions: [
        {
          id: "upload",
          label: uploadMutation.isPending ? "Đang tải…" : "Upload",
          icon: <Upload className="size-3.5" aria-hidden />,
          variant: "outline",
          disabled: uploadMutation.isPending,
          onClick: () => fileInputRef.current?.click(),
        },
        {
          id: "mirror",
          label: "Mirror URL",
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
    toast.error("Không tải được danh sách cloud", {
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
          toast.success("Đã upload", { description: dto.fileName });
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Upload thất bại.";
          toast.error("Upload thất bại", { description: message });
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
          <AlertDialogTitle>Xóa khỏi cloud?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa tệp{" "}
            <strong>{pendingDelete?.fileName}</strong> khỏi cloud?
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
