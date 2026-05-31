"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronRight,
  File,
  FileImage,
  FileVideo,
  Folder,
  FolderOpen,
  MoreVertical,
  Pen,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useFolderTreeQuery,
  useCreateFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useUploadCloudFileMutation,
  useDeleteCloudFileMutation,
  useCloudFilesQuery,
} from "@/hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import { folderQueryKeys } from "@/hooks/api/use-folders";
import {
  CommonHeader,
  type CommonHeaderProps,
} from "@/components/shared/common";
import { FixedBottomLoadProgress } from "@/components/shared/load-progress";
import { ApiError } from "@/lib/api-client";
import { cloudStorageService } from "@/services/cloud-storage-service";
import { formatFileSizeBytes } from "@/lib/format-file-size";
import { StreamFileDialog } from "@/app/(admin)/admin/cloud/stream-file-dialog";
import { toast } from "sonner";
import type { FolderDto } from "@/types/folder";
import type { CloudFileDto } from "@/types/cloud-storage";

const TOKEN_KEYS = ["accessToken", "token", "authToken"] as const;

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

function getStoredToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

function buildFolderMap(folders: FolderDto[]): Map<number, FolderDto> {
  const map = new Map<number, FolderDto>();
  for (const f of folders) {
    map.set(f.id, f);
  }
  return map;
}

function buildBreadcrumbs(
  folderId: number | null,
  folderMap: Map<number, FolderDto>,
): FolderDto[] {
  const crumbs: FolderDto[] = [];
  let current = folderId ? folderMap.get(folderId) : null;
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? folderMap.get(current.parentId) : null;
  }
  return crumbs;
}

function getChildFolders(
  parentId: number | null,
  folders: FolderDto[],
): FolderDto[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function FileCard({
  file,
  kind,
  token,
  onView,
  onDelete,
}: {
  file: CloudFileDto;
  kind: ReturnType<typeof fileKind>;
  token?: string;
  onView: () => void;
  onDelete: () => void;
}) {
  const [thumbnailBlobUrl, setThumbnailBlobUrl] = useState<string | null>(null);
  const [useExtensionTile, setUseExtensionTile] = useState(false);

  useEffect(() => {
    if (!token || !file.thumbnailFileId) {
      setThumbnailBlobUrl(null);
      setUseExtensionTile(false);
      return;
    }

    const ac = new AbortController();
    let localUrl: string | null = null;
    (async () => {
      try {
        const blob = await cloudStorageService.fetchThumbnailBlob(
          file.id,
          token,
        );
        if (ac.signal.aborted) return;
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
  }, [file.id, file.thumbnailFileId, token]);

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all hover:shadow-md border-border/50 hover:border-primary/30">
      <div 
        className="relative aspect-video w-full bg-muted/60 overflow-hidden flex items-center justify-center cursor-pointer"
        onClick={onView}
      >
        {thumbnailBlobUrl ? (
          <img
            src={thumbnailBlobUrl}
            alt={`Thumbnail ${file.fileName}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : useExtensionTile ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted text-xs font-semibold tracking-wide text-black">
            <File className="mb-1.5 size-8 text-muted-foreground/80" aria-hidden />
            <span>{fileExtensionLabel(file.fileName)}</span>
          </div>
        ) : (
          <div className="transition-transform duration-300 group-hover:scale-110">
            {kind === "image" ? (
              <FileImage className="size-16 text-sky-500/80 drop-shadow-sm" />
            ) : kind === "video" ? (
              <FileVideo className="size-16 text-purple-500/80 drop-shadow-sm" />
            ) : (
              <File className="size-16 text-muted-foreground/60 drop-shadow-sm" />
            )}
          </div>
        )}
        
        {/* DropdownMenu overlay */}
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "size-7 bg-background/80 hover:bg-background shadow-sm backdrop-blur-sm")}>
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onView}>
                <File className="mr-2 size-3.5" />
                Xem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast.info("Thông tin file", {
                  description: `${file.fileName}\nKích thước: ${formatFileSizeBytes(file.fileSize)}\nLoại: ${file.mimeType}\nNgày tạo: ${new Date(file.createdAt).toLocaleString("vi-VN")}`,
                });
              }}>
                <File className="mr-2 size-3.5" />
                Thông tin
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 size-3.5" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <CardContent className="p-3 pt-3 flex flex-col gap-0.5">
        <h4 className="truncate text-sm font-semibold text-foreground" title={file.fileName}>
          {file.fileName}
        </h4>
        <p className="text-xs text-muted-foreground">
          {formatFileSizeBytes(file.fileSize)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminFoldersPage() {
  const queryClient = useQueryClient();
  const [token] = useState<string | undefined>(() => getStoredToken());
  const { data: folders = [], isLoading } = useFolderTreeQuery(token);
  const createMutation = useCreateFolderMutation(token);
  const renameMutation = useRenameFolderMutation(token);
  const deleteMutation = useDeleteFolderMutation(token);
  const uploadMutation = useUploadCloudFileMutation(token);
  const deleteFileMutation = useDeleteCloudFileMutation(token);

  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(
    () => new Set(),
  );

  const filesQuery = useCloudFilesQuery(
    {
      page: 1,
      pageSize: 200,
      folderId: currentFolderId ?? undefined,
      rootFilesOnly: currentFolderId === null ? true : undefined,
    },
    token,
    { enabled: Boolean(token) },
  );
  const files = filesQuery.data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");

  const [renameTarget, setRenameTarget] = useState<FolderDto | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FolderDto | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<CloudFileDto | null>(
    null,
  );
  const [streamTarget, setStreamTarget] = useState<CloudFileDto | null>(null);
  const [streamOpen, setStreamOpen] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folderMap = useMemo(() => buildFolderMap(folders), [folders]);
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentFolderId, folderMap),
    [currentFolderId, folderMap],
  );
  const childFolders = useMemo(
    () => getChildFolders(currentFolderId, folders),
    [currentFolderId, folders],
  );

  const rootFolders = useMemo(() => getChildFolders(null, folders), [folders]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpenCreate = useCallback((parentId: number | null = null) => {
    setCreateParentId(parentId);
    setCreateName("");
    setCreateOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    const name = createName.trim();
    if (!name) return;
    createMutation.mutate(
      { name, parentId: createParentId },
      {
        onSuccess: () => setCreateOpen(false),
      },
    );
  }, [createName, createParentId, createMutation]);

  const handleOpenRename = useCallback((folder: FolderDto) => {
    setRenameTarget(folder);
    setRenameName(folder.name);
  }, []);

  const handleRename = useCallback(() => {
    const name = renameName.trim();
    if (!name || !renameTarget) return;
    renameMutation.mutate(
      { id: renameTarget.id, name },
      { onSuccess: () => setRenameTarget(null) },
    );
  }, [renameName, renameTarget, renameMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (currentFolderId === deleteTarget.id) {
          setCurrentFolderId(null);
        }
      },
    });
  }, [deleteTarget, deleteMutation, currentFolderId]);

  const handleDeleteFile = useCallback(() => {
    if (!deleteFileTarget) return;
    deleteFileMutation.mutate(deleteFileTarget.id, {
      onSuccess: () => {
        setDeleteFileTarget(null);
        toast.success("Đã xóa file", {
          description: deleteFileTarget.fileName,
        });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.message : "Xóa file thất bại.";
        toast.error("Xóa file thất bại", { description: msg });
      },
    });
  }, [deleteFileTarget, deleteFileMutation]);

  const handleUploadPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !token || uploadMutation.isPending) return;
    setUploadPercent(0);
    uploadMutation.mutate(
      {
        file: f,
        folderId: currentFolderId,
        onProgress: (ev) => {
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
          queryClient.invalidateQueries({ queryKey: folderQueryKeys.all });
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

  function renderFolderTreeNode(
    parentId: number | null,
    depth: number,
  ): React.ReactNode {
    const items =
      parentId === null ? rootFolders : getChildFolders(parentId, folders);

    return items.map((f) => {
      const hasChildren = f.childrenCount > 0;
      const isExpanded = expandedFolders.has(f.id);
      const isActive = currentFolderId === f.id;

      return (
        <div key={f.id}>
          <button
            type="button"
            onClick={() => {
              setCurrentFolderId(f.id);
              if (hasChildren) toggleExpand(f.id);
            }}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/80",
              isActive ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasChildren ? (
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/70 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            ) : (
              <span className="size-3.5 shrink-0" />
            )}
            <Folder className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} />
            <span className="truncate">{f.name}</span>
          </button>
          {hasChildren && isExpanded && (
            <div className="mt-0.5">{renderFolderTreeNode(f.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  const pageHeader: CommonHeaderProps = useMemo(
    () => ({
      title: currentFolderId
        ? (folderMap.get(currentFolderId)?.name ?? "Thư mục")
        : "Thư mục",
      subtitle: currentFolderId ? undefined : "quản lý thư mục",
      actions: [
        {
          id: "create",
          label: "Tạo thư mục",
          icon: <Plus className="size-3.5" aria-hidden />,
          variant: "outline",
          onClick: () => handleOpenCreate(currentFolderId),
        },
        {
          id: "upload",
          label: uploadMutation.isPending ? "Đang tải lên…" : "Tải lên",
          icon: <Upload className="size-3.5" aria-hidden />,
          variant: "outline",
          disabled: uploadMutation.isPending,
          onClick: () => fileInputRef.current?.click(),
        },
      ],
    }),
    [currentFolderId, folderMap, uploadMutation.isPending, handleOpenCreate],
  );

  const hasFolders = childFolders.length > 0;
  const hasFiles = files.length > 0;
  const isEmpty = !hasFolders && !hasFiles;
  const isLoadingAll = isLoading || filesQuery.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUploadPick}
      />

      <CommonHeader {...pageHeader} />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm lg:flex">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3">
            <span className="text-sm font-semibold tracking-tight">
              Cây thư mục
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => handleOpenCreate(null)}
              title="Tạo thư mục mới"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2 py-2">
            {isLoading ? (
              <p className="p-2 text-xs text-muted-foreground">Đang tải…</p>
            ) : (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(null)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    currentFolderId === null
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                  )}
                >
                  <FolderOpen className="size-4.5" />
                  <span className="truncate">Thư mục gốc</span>
                </button>
                <div className="ml-1 border-l border-border/60 pl-1 mt-1">
                  {renderFolderTreeNode(null, 0)}
                </div>
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-card border border-border/50 px-3 py-2.5 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className="transition-colors hover:text-foreground font-medium flex items-center gap-1.5"
            >
              <FolderOpen className="size-4" />
              Gốc
            </button>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="transition-colors hover:text-foreground font-medium"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {isLoadingAll ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Đang tải…
            </div>
          ) : isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-sm text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
              <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="size-10 text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-base">Thư mục trống</p>
                <p className="text-muted-foreground mt-1">Tạo thư mục con hoặc tải file lên đây.</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreate(currentFolderId)}
                  className="rounded-[50px] font-semibold"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Tạo thư mục
                </Button>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[50px] font-semibold"
                >
                  <Upload className="mr-1.5 size-3.5" />
                  Tải file lên
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
              {childFolders.map((folder) => {
                return (
                  <Card
                    key={`folder-${folder.id}`}
                    className="group relative flex flex-col overflow-hidden transition-all hover:shadow-md border-border/50 hover:border-primary/30 cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-center justify-between gap-1 p-3 pb-0">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={folder.name}>
                        {folder.name}
                      </span>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-7 hover:bg-muted text-muted-foreground")}>
                            <MoreVertical className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleOpenRename(folder)}>
                              <Pen className="mr-2 size-3.5" />
                              Đổi tên
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteTarget(folder)}>
                              <Trash2 className="mr-2 size-3.5" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
                      <Folder className="size-16 text-amber-500/80 transition-transform duration-300 group-hover:scale-110 drop-shadow-sm" />
                    </CardContent>
                  </Card>
                );
              })}

              {files.map((file) => {
                const kind = fileKind(file.mimeType);
                return (
                  <FileCard
                    key={`file-${file.id}`}
                    file={file}
                    kind={kind}
                    token={token}
                    onView={() => {
                      setStreamTarget(file);
                      setStreamOpen(true);
                    }}
                    onDelete={() => setDeleteFileTarget(file)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FixedBottomLoadProgress
        show={uploadMutation.isPending}
        label="Tải lên"
        value={uploadPercent ?? 0}
        showPercent
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thư mục mới</DialogTitle>
            <DialogDescription>Nhập tên cho thư mục mới.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="folder-name">Tên thư mục</FieldLabel>
            <FieldContent>
              <Input
                id="folder-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nhập tên thư mục"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-[50px]"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createName.trim() || createMutation.isPending}
              className="rounded-[50px]"
            >
              {createMutation.isPending ? "Đang tạo…" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên thư mục</DialogTitle>
            <DialogDescription>Nhập tên mới cho thư mục.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="rename-folder-name">Tên thư mục</FieldLabel>
            <FieldContent>
              <Input
                id="rename-folder-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Nhập tên mới"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
                autoFocus
              />
            </FieldContent>
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              className="rounded-[50px]"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim() || renameMutation.isPending}
              className="rounded-[50px]"
            >
              {renameMutation.isPending ? "Đang đổi…" : "Đổi tên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Xóa thư mục?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa thư mục <strong>{deleteTarget?.name}</strong>?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? "Đang xóa…" : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteFileTarget !== null}
        onOpenChange={(open) => !open && setDeleteFileTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Xóa file?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn xóa file{" "}
            <strong>{deleteFileTarget?.fileName}</strong>?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDeleteFile}
            >
              {deleteFileMutation.isPending ? "Đang xóa…" : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
