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
import { Loader2, Trash2, ExternalLink } from "lucide-react";

type MediaLibraryPanelProps = {
  /** Link to full-page library (optional). */
  fullPageHref?: string;
};

export function MediaLibraryPanel({ fullPageHref }: MediaLibraryPanelProps) {
  const { toast } = useToast();
  const { uploadFile } = useS3DirectUpload();
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
  }, [toast]);

  const refresh = () => {
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
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            className="max-w-xs"
            disabled={uploading}
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files yet. Choose a file above to upload to your tenant library.
        </p>
      ) : (
        <ul className="space-y-2 border rounded-md divide-y">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.fileName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {a.mimeType}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
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
                  disabled={deletingId === a.id}
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
      )}

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
