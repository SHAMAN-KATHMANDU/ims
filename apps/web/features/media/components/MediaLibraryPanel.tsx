"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Can } from "@/features/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useS3DirectUpload } from "../hooks/use-s3-direct-upload";
import {
  deleteMediaAsset,
  listMediaAssets,
  updateMediaAsset,
  type MediaAssetRow,
  type MediaPurpose,
} from "../services/media.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Loader2,
  Files,
  MoreVertical,
  ExternalLink,
  Pencil,
  Link2,
  Trash2,
  FileText,
  ImageOff,
} from "lucide-react";

type MediaLibraryPanelProps = {
  /** Link to full-page library (optional). */
  fullPageHref?: string;
};

type LibraryListFilter = "all" | "images" | "videos" | MediaPurpose;

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type ThumbnailStrategy = "next" | "img" | "broken";

function MediaCardThumbnail({ asset }: { asset: MediaAssetRow }) {
  const [strategy, setStrategy] = useState<ThumbnailStrategy>("next");
  const isImage = asset.mimeType.startsWith("image/");

  useEffect(() => {
    setStrategy("next");
  }, [asset.id, asset.publicUrl]);

  if (!isImage) {
    const kind =
      asset.mimeType === "application/pdf"
        ? "PDF"
        : asset.mimeType.includes("word") || asset.mimeType.includes("document")
          ? "Document"
          : "File";
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-4 text-center">
        <FileText
          className="h-10 w-10 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="text-xs text-muted-foreground">{kind}</span>
      </div>
    );
  }

  if (strategy === "broken") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <ImageOff className="h-10 w-10 text-muted-foreground/70" aria-hidden />
      </div>
    );
  }

  if (strategy === "img") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Fallback when `next/image` fails (e.g. host not in remotePatterns)
      <img
        src={asset.publicUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setStrategy("broken")}
      />
    );
  }

  return (
    <Image
      src={asset.publicUrl}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      unoptimized
      onError={() => setStrategy("img")}
    />
  );
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediaAssetRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAssetRow | null>(null);
  const [listFilter, setListFilter] = useState<LibraryListFilter>("all");

  const fetchPage = useCallback(
    async (cursor: string | undefined) => {
      const params: Parameters<typeof listMediaAssets>[0] = {
        limit: 30,
        cursor,
      };
      if (listFilter === "images") {
        params.mimePrefix = "image/";
      } else if (listFilter === "videos") {
        params.mimePrefix = "video/";
      } else if (listFilter !== "all") {
        params.purpose = listFilter;
      }
      return listMediaAssets(params);
    },
    [listFilter],
  );

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
  }, [mediaUploadEnabled, toast, fetchPage]);

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

  const openRename = (asset: MediaAssetRow) => {
    setRenameTarget(asset);
    setRenameValue(asset.fileName);
    setRenameOpen(true);
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const updated = await updateMediaAsset(renameTarget.id, {
        fileName: renameValue.trim(),
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast({ title: "Name updated" });
      setRenameOpen(false);
      setRenameTarget(null);
    } catch (err) {
      toast({
        title: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setRenaming(false);
    }
  };

  const copyPublicUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Could not copy link",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteMediaAsset(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast({ title: "Deleted" });
    } catch (err) {
      toast({
        title: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const promptDelete = (asset: MediaAssetRow) => {
    setDeleteTarget(asset);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {!mediaUploadEnabled && (
        <p className="text-sm text-muted-foreground">
          Media uploads are disabled in this environment.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Can perm="WEBSITE.MEDIA.CREATE">
            <Input
              type="file"
              className="max-w-xs"
              disabled={uploading || !mediaUploadEnabled}
              onChange={onFile}
              accept="image/*,application/pdf,.doc,.docx"
            />
          </Can>
          {uploading && (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <Select
            value={listFilter}
            onValueChange={(v) => setListFilter(v as LibraryListFilter)}
            disabled={!mediaUploadEnabled}
          >
            <SelectTrigger className="w-[200px]" aria-label="Filter library">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All files</SelectItem>
              <SelectItem value="images">Images only</SelectItem>
              <SelectItem value="videos">Videos only</SelectItem>
              <SelectItem value="library">Source: Library upload</SelectItem>
              <SelectItem value="product_photo">
                Source: Product photos
              </SelectItem>
              <SelectItem value="contact_attachment">
                Source: Contact attachments
              </SelectItem>
              <SelectItem value="message_media">Source: Messages</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {fullPageHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={fullPageHref}>Open full library</Link>
          </Button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files yet. Choose a file above to upload to your tenant library.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <li
              key={a.id}
              className="group relative overflow-hidden rounded-lg border bg-card shadow-sm"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                <MediaCardThumbnail asset={a} />
                <div className="absolute right-1 top-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shadow-md opacity-90"
                        aria-label={`Actions for ${a.fileName}`}
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <a
                          href={a.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <ExternalLink
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Open
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void copyPublicUrl(a.publicUrl)}
                      >
                        <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Copy link
                      </DropdownMenuItem>
                      <Can perm="WEBSITE.MEDIA.UPDATE" fallback={null}>
                        <DropdownMenuItem
                          disabled={!mediaUploadEnabled}
                          onClick={() => openRename(a)}
                        >
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                      </Can>
                      <Can perm="WEBSITE.MEDIA.DELETE" fallback={null}>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!mediaUploadEnabled || deletingId === a.id}
                          onClick={() => promptDelete(a)}
                        >
                          {deletingId === a.id ? (
                            <Loader2
                              className="mr-2 h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                          )}
                          Delete
                        </DropdownMenuItem>
                      </Can>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="border-t px-2 py-2">
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={a.fileName}
                >
                  {a.fileName}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatBytes(a.byteSize)} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
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
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Files className="h-4 w-4" aria-hidden="true" />
            )}
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="media-rename-fileName">Display name</Label>
            <Input
              id="media-rename-fileName"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              disabled={renaming}
              maxLength={255}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitRename();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={renaming || !renameValue.trim()}
              onClick={() => void submitRename()}
            >
              {renaming ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove "${deleteTarget.fileName}" from your library and delete the stored object. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => void confirmDelete()}
            >
              {deletingId ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
