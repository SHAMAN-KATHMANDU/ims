"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Copy, Trash2, Eye } from "lucide-react";
import type { MediaAsset } from "./types";

interface MediaTileProps {
  asset: MediaAsset;
  onDelete: (id: string) => void;
  onEdit: (asset: MediaAsset) => void;
}

export function MediaTile({ asset, onDelete, onEdit }: MediaTileProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="group relative rounded-lg border border-line bg-bg-elev overflow-hidden hover:border-accent transition-colors">
      {/* Thumbnail */}
      <div className="aspect-square bg-bg-sunken relative overflow-hidden">
        {asset.mimeType.startsWith("image/") ? (
          <Image
            src={asset.url}
            alt={asset.name}
            fill
            className="object-cover"
          />
        ) : asset.mimeType === "application/pdf" ? (
          <div className="flex items-center justify-center h-full text-2xl opacity-50">
            📄
          </div>
        ) : asset.mimeType.startsWith("video/") ? (
          <div className="flex items-center justify-center h-full text-2xl opacity-50">
            🎬
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-2xl opacity-50">
            📎
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEdit(asset)}
            className="gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy URL"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(asset.id)}
                className="text-danger"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <div className="font-mono text-xs font-medium truncate text-ink">
          {asset.name}
        </div>
        <div className="font-mono text-2xs text-ink-4 space-y-0.5">
          {asset.width && asset.height && (
            <div>{`${asset.width}×${asset.height}`}</div>
          )}
          <div>{formatBytes(asset.size)}</div>
        </div>
      </div>
    </div>
  );
}
