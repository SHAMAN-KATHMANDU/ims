"use client";

import { useEffect, useState } from "react";
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

type MediaLibraryPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (publicUrl: string) => void;
  title?: string;
};

export function MediaLibraryPickerDialog({
  open,
  onOpenChange,
  onPick,
  title = "Choose from library",
}: MediaLibraryPickerDialogProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listMediaAssets({ limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items.filter((a) => a.mimeType.startsWith("image/")));
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
  }, [open, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No images in your library yet. Upload from the media library in the
            header, or register uploads after adding files.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                className="relative aspect-square rounded border overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => {
                  onPick(a.publicUrl);
                  onOpenChange(false);
                }}
              >
                <Image
                  src={a.publicUrl}
                  alt={a.fileName}
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
