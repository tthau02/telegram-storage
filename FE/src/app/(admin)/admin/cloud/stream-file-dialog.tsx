"use client";

import { useEffect, useState } from "react";
import { Download, FileQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinearLoadProgress } from "@/components/shared/load-progress";
import { cn } from "@/lib/utils";
import { cloudStorageService } from "@/services/cloud-storage-service";
import type { CloudFileDto } from "@/types/cloud-storage";

const LARGE_BYTES = 120 * 1024 * 1024;

type StreamFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: CloudFileDto | null;
  token?: string;
};

function previewKind(
  mime: string,
): "video" | "audio" | "image" | "pdf" | "other" {
  const m = mime.toLowerCase();
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  return "other";
}

export function StreamFileDialog({
  open,
  onOpenChange,
  file,
  token,
}: StreamFileDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file?.id || !token) {
      return;
    }

    const id = file.id;
    const mime = file.mimeType || "application/octet-stream";
    const skipBlob = file.fileSize > LARGE_BYTES;

    if (skipBlob) {
      toast.error("Tệp quá lớn", {
        description:
          "Không thể tải trước trong trình duyệt. Dùng tải xuống (API có xác thực).",
      });
      setBlobUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBlobUrl(null);

    const ac = new AbortController();

    (async () => {
      try {
        const blob = await cloudStorageService.fetchStreamBlob(id, token);
        if (ac.signal.aborted) return;
        const typed =
          blob.type && blob.type !== "application/octet-stream"
            ? blob
            : new Blob([blob], { type: mime });
        const url = URL.createObjectURL(typed);
        if (!ac.signal.aborted) setBlobUrl(url);
        else URL.revokeObjectURL(url);
      } catch (e) {
        if (ac.signal.aborted) return;
        toast.error("Không tải được luồng", {
          description:
            e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.",
        });
        setBlobUrl(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      ac.abort();
    };
  }, [open, file?.id, file?.mimeType, file?.fileSize, token]);

  useEffect(() => {
    if (!open) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLoading(false);
    }
  }, [open]);

  const kind = file ? previewKind(file.mimeType) : "other";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl",
          "max-h-[min(90dvh,52rem)]",
          kind === "video" && "sm:max-w-4xl",
        )}
      >
        <div className="flex shrink-0 items-center border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <DialogHeader className="w-full space-y-0 pr-8 text-left sm:pr-10">
            <DialogTitle className="line-clamp-2 text-base font-medium leading-snug">
              {file ? file.fileName : "Xem file"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {!file ? (
            <p className="p-4 px-4 text-sm text-muted-foreground sm:px-6">
              Chưa chọn tệp.
            </p>
          ) : loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 px-6 py-10 sm:min-h-64 sm:py-12">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/15 blur-xl" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                  <Loader2
                    className="size-7 animate-spin text-primary"
                    aria-hidden
                  />
                </div>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-foreground">
                  Đang tải luồng…
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Chuẩn bị nội dung trong trình duyệt. File lớn có thể mất vài
                  giây.
                </p>
              </div>
              <div className="mx-auto w-56 px-1">
                <LinearLoadProgress indeterminate variant="medium" />
              </div>
            </div>
          ) : blobUrl && kind === "video" ? (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center bg-black">
              <video
                key={blobUrl}
                className="mx-auto max-h-[min(70vh,720px)] w-full object-contain"
                controls
                playsInline
                preload="metadata"
                src={blobUrl}
              >
                Trình duyệt không hỗ trợ video.
              </video>
            </div>
          ) : blobUrl && kind === "audio" ? (
            <div className="flex flex-col items-center justify-center px-4 py-6 sm:px-6">
              <audio
                key={blobUrl}
                className="w-full max-w-md accent-primary"
                controls
                src={blobUrl}
              >
                Trình duyệt không hỗ trợ âm thanh.
              </audio>
            </div>
          ) : blobUrl && kind === "image" ? (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center overflow-auto p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL động */}
              <img
                src={blobUrl}
                alt={file.fileName}
                className="max-h-[min(70vh,720px)] max-w-full object-contain"
              />
            </div>
          ) : blobUrl && kind === "pdf" ? (
            <iframe
              title={file.fileName}
              src={blobUrl}
              className="h-[min(70vh,720px)] min-h-[50vh] w-full border-0"
            />
          ) : blobUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 px-4 py-10 sm:px-6">
              <FileQuestion
                className="size-10 text-muted-foreground"
                aria-hidden
              />
              <a
                href={blobUrl}
                download={file.fileName}
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                <Download className="size-4" aria-hidden />
                Tải xuống
              </a>
            </div>
          ) : file.thumbnailUrl ? (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center overflow-auto p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL ảnh thumbnail do backend trả */}
              <img
                src={file.thumbnailUrl}
                alt={`Thumbnail ${file.fileName}`}
                className="max-h-[min(70vh,720px)] max-w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
