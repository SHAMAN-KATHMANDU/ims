"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaFolders } from "./use-media";
import type { MediaAsset } from "./types";

interface MediaDetailDialogProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: { altText?: string | null; name?: string; folder?: string | null },
  ) => void;
  isUpdating?: boolean;
}

export function MediaDetailDialog({
  asset,
  onClose,
  onUpdate,
  isUpdating,
}: MediaDetailDialogProps) {
  const [name, setName] = useState("");
  const [altText, setAltText] = useState("");
  const [folderValue, setFolderValue] = useState<string>("");
  const { data: folders = [] } = useMediaFolders();

  useEffect(() => {
    if (asset) {
      setName(asset.name || "");
      setAltText(asset.altText || "");
      setFolderValue(asset.folder || "");
    }
  }, [asset]);

  if (!asset) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleSave = () => {
    onUpdate(asset.id, {
      name: name !== asset.name ? name : undefined,
      altText: altText !== (asset.altText || "") ? altText || null : undefined,
      folder:
        folderValue !== (asset.folder || "") ? folderValue || null : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asset details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="rounded-lg border border-line bg-bg-elev overflow-hidden">
            {asset.mimeType.startsWith("image/") ? (
              <Image
                src={asset.url}
                alt={asset.name}
                width={500}
                height={400}
                className="w-full max-h-96 object-cover"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-4xl opacity-50 bg-bg-sunken">
                📄
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-2">
                Filename
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Filename"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink block mb-2">
                Alt text
              </label>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink block mb-2">
                Folder
              </label>
              <Select
                value={folderValue || "__none__"}
                onValueChange={(v) => setFolderValue(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No folder</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-mono text-ink-4 uppercase tracking-wide mb-1">
                  Size
                </div>
                <div className="font-mono text-sm text-ink">
                  {formatBytes(asset.size)}
                </div>
              </div>
              {asset.width && asset.height && (
                <>
                  <div>
                    <div className="text-xs font-mono text-ink-4 uppercase tracking-wide mb-1">
                      Width
                    </div>
                    <div className="font-mono text-sm text-ink">
                      {asset.width}px
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-ink-4 uppercase tracking-wide mb-1">
                      Height
                    </div>
                    <div className="font-mono text-sm text-ink">
                      {asset.height}px
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <div className="text-xs font-mono text-ink-4 uppercase tracking-wide mb-2">
                URL
              </div>
              <div className="font-mono text-xs text-ink-3 break-all px-3 py-2 rounded bg-bg-sunken">
                {asset.url}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-line">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
