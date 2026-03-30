"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useS3DirectUpload } from "@/hooks/useS3DirectUpload";
import {
  deleteMediaAsset,
  listMediaAssets,
  type MediaAssetRow,
} from "@/services/mediaService";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import { Loader2, Trash2, ExternalLink, Files } from "lucide-react";

type MediaLibraryPanelProps = {
  /** Link to full-page library (optional). */
  fullPageHref?: string;
};

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MediaLibraryPanel({ fullPageHref }: MediaLibraryPanelProps) {
  const { toast } = useToast();
  const { uploadFile, mediaUploadEnabled } = useS3DirectUpload();
  const [items, setItems] = useState<MediaAssetRow[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = async (cursor: string | undefined) => {
    return listMediaAssets({ limit: 30, cursor });
  };

  useEffect(() => {
    if (!mediaUploadEnabled) {
      setItems([]);
      setHasMore(false);
      nextCursorRef.current = null;
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    nextCursorRef.current = null;
    fetchPage(undefined)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        nextCursorRef.current = res.nextCursor;
        setHasMore(Boolean(res.nextCursor));
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
  }, [mediaUploadEnabled, toast]);

  const refresh = () => {
    if (!mediaUploadEnabled) return;

    setLoading(true);
    nextCursorRef.current = null;
    fetchPage(undefined)
      .then((res) => {
        setItems(res.items);
        nextCursorRef.current = res.nextCursor;
        setHasMore(Boolean(res.nextCursor));
      })
      .catch((e) => {
        toast({
          title: getApiErrorMessage(e),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    if (!mediaUploadEnabled) return;

    const c = nextCursorRef.current;
    if (!c) return;
    setLoadingMore(true);
    fetchPage(c)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        nextCursorRef.current = res.nextCursor;
        setHasMore(Boolean(res.nextCursor));
      })
      .catch((e) => {
        toast({
          title: getApiErrorMessage(e),
          variant: "destructive",
        });
      })
      .finally(() => setLoadingMore(false));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile({
        file,
        purpose: "library",
        registerInLibrary: true,
      });
      toast({ title: "Uploaded" });
      refresh();
    } catch (err) {
      toast({
        title: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMediaAsset(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast({ title: "Deleted" });
    } catch (err) {
      toast({
        title: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {!mediaUploadEnabled && (
        <p className="text-sm text-muted-foreground">
          Media uploads are disabled in this environment.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            className="max-w-xs"
            disabled={uploading || !mediaUploadEnabled}
            onChange={onFile}
            accept="image/*,application/pdf,.doc,.docx"
          />
          {uploading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {fullPageHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={fullPageHref}>Open full library</Link>
          </Button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files yet. Choose a file above to upload to your tenant library.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[minmax(0,1fr)_150px_90px_90px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>File</span>
            <span>Type</span>
            <span>Size</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y">
            {items.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_150px_90px_90px] items-center gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.fileName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {a.mimeType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(a.byteSize)}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={a.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={deletingId === a.id || !mediaUploadEnabled}
                    onClick={() => onDelete(a.id)}
                    aria-label="Delete"
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {items.length > 0
            ? `${items.length} file${items.length === 1 ? "" : "s"} loaded`
            : ""}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={loadMore}
            className="gap-1.5"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Files className="h-4 w-4" />
            )}
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
}
