"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaAssetRow } from "../../hooks/useMediaLibraryQuery";

interface MediaItemCardProps {
  asset: MediaAssetRow;
  onSelect: () => void;
}

export function MediaItemCard({ asset, onSelect }: MediaItemCardProps) {
  const isVideo = asset.mimeType.startsWith("video/");

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative aspect-square rounded border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden group",
      )}
      title={asset.fileName}
    >
      {isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <Play className="w-8 h-8 text-white" />
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- thumbnail grid renders many small images; next/image's per-thumb optimisation adds overhead without LCP benefit here */
        <img
          src={asset.publicUrl}
          alt={asset.fileName}
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />

      {/* Filename at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{asset.fileName}</p>
      </div>
    </button>
  );
}
