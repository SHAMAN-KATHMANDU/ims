"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaAssets } from "../../hooks/useMediaLibraryQuery";
import { MediaUploadDropZone } from "./MediaUploadDropZone";
import { MediaItemCard } from "./MediaItemCard";
import { MediaDetailDrawer } from "./MediaDetailDrawer";

type MediaType = "all" | "image" | "video";

export function MediaLibraryPanel() {
  const mediaQuery = useMediaAssets();
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("all");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const assets = useMemo(() => {
    const raw = mediaQuery.data?.items ?? [];
    return raw.filter((a) => {
      if (mediaType !== "all") {
        const mimePrefix = a.mimeType.split("/")[0];
        if (mimePrefix !== mediaType) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.fileName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [mediaQuery.data?.items, search, mediaType]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Upload zone */}
      <MediaUploadDropZone />

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select
          value={mediaType}
          onValueChange={(val) => setMediaType(val as MediaType)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {assets.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            {assets.map((asset) => (
              <MediaItemCard
                key={asset.id}
                asset={asset}
                onSelect={() => setSelectedAsset(asset.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-500">
          {mediaQuery.isLoading
            ? "Loading..."
            : assets.length === 0 && mediaQuery.data
              ? "No media yet. Upload to get started."
              : "No matches"}
        </div>
      )}

      {/* Detail drawer */}
      {selectedAsset && (
        <MediaDetailDrawer
          assetId={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
