"use client";

import { useEffect, useState } from "react";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listMediaAssets, type MediaAssetRow } from "@/services/mediaService";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import Image from "next/image";
import { Images, ImageOff, Loader2 } from "lucide-react";

type MediaLibraryPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (asset: { publicUrl: string; fileName: string }) => void;
  title?: string;
};

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MediaLibraryPickerDialog({
  open,
  onOpenChange,
  onPick,
  title = "Choose from library",
}: MediaLibraryPickerDialogProps) {
  const { toast } = useToast();
  const mediaUploadEnabled = useEnvFeatureFlag(EnvFeature.MEDIA_UPLOAD);
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!open || !mediaUploadEnabled) return;
    let cancelled = false;
    setLoading(true);
    listMediaAssets({ limit: 30 })
      .then((res) => {
        if (!cancelled) {
          const imageItems = res.items.filter((a) =>
            a.mimeType.startsWith("image/"),
          );
          setItems(imageItems);
          setNextCursor(res.nextCursor);
        }
      })
      .catch((e) => {
        toast({
          title: getApiErrorMessage(e),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mediaUploadEnabled, toast]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore || !mediaUploadEnabled) return;
    setLoadingMore(true);
    try {
      const res = await listMediaAssets({ limit: 30, cursor: nextCursor });
      const imageItems = res.items.filter((a) =>
        a.mimeType.startsWith("image/"),
      );
      setItems((prev) => [...prev, ...imageItems]);
      setNextCursor(res.nextCursor);
    } catch (e) {
      toast({
        title: getApiErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-4 w-4 text-muted-foreground" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading images...
            </div>
          ) : !mediaUploadEnabled ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Media uploads are disabled in this environment.
            </p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <ImageOff
                className="h-8 w-8 text-muted-foreground/70"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                No images in your library yet. Upload from the media library in
                the header, or register uploads after adding files.
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[72px_minmax(0,1fr)_110px_90px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>Preview</span>
                <span>File name</span>
                <span>Type</span>
                <span>Size</span>
              </div>
              <div className="divide-y">
                {items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="grid w-full grid-cols-[72px_minmax(0,1fr)_110px_90px] items-center gap-3 px-4 py-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Pick ${a.fileName}`}
                    onClick={() => {
                      onPick({ publicUrl: a.publicUrl, fileName: a.fileName });
                      onOpenChange(false);
                    }}
                  >
                    <div className="relative h-12 w-16 overflow-hidden rounded border bg-muted">
                      <Image
                        src={a.publicUrl}
                        alt={a.fileName}
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized
                      />
                    </div>
                    <span className="truncate text-sm font-medium">
                      {a.fileName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {a.mimeType.replace("image/", "")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(a.byteSize)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {items.length > 0
              ? `${items.length} image${items.length === 1 ? "" : "s"} loaded`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            {nextCursor && mediaUploadEnabled && (
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-1.5"
              >
                {loadingMore ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Images className="h-4 w-4" aria-hidden="true" />
                )}
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
