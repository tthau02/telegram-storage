"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useMirrorCloudFileMutation } from "@/hooks/api";

type MirrorUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
};

export function MirrorUploadDialog({
  open,
  onOpenChange,
  token,
}: MirrorUploadDialogProps) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const mirrorMutation = useMirrorCloudFileMutation(token);

  const reset = () => {
    setUrl("");
    setFileName("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = () => {
    const u = url.trim();
    if (!u) {
      toast.error("Cần nhập URL nguồn.");
      return;
    }
    if (!token) return;
    mirrorMutation.mutate(
      {
        url: u,
        fileName: fileName.trim() || null,
      },
      {
        onSuccess: (dto) => {
          toast.success("Đã mirror tệp lên cloud", {
            description: dto.fileName,
          });
          handleClose(false);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Mirror thất bại.";
          toast.error("Mirror thất bại", { description: message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mirror từ URL</DialogTitle>
          <DialogDescription>
            Backend sẽ kéo nội dung (yt-dlp / HTTP) và lưu như tệp cloud.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="mirror-url">URL</FieldLabel>
            <FieldContent>
              <Input
                id="mirror-url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="mirror-name">Tên file (tuỳ chọn)</FieldLabel>
            <FieldContent>
              <Input
                id="mirror-name"
                placeholder="Để trống để server tự chọn"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={mirrorMutation.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={mirrorMutation.isPending || !token}
          >
            {mirrorMutation.isPending ? "Đang xử lý…" : "Mirror"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
