"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMediaList, useDeleteMedia, useUpdateMedia } from "./use-media";
import { MediaTile } from "./MediaTile";
import { MediaDetailDialog } from "./MediaDetailDialog";
import { Upload, Search, Folder } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import type { MediaAsset } from "./types";

const FOLDERS = [
  "All",
  "Brand",
  "Interior",
  "Exterior",
  "Food",
  "Bar",
  "Team",
  "Documents",
];

export function MediaLibraryView() {
  const [folder, setFolder] = useState("All");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  const { data: allMedia = [], isLoading } = useMediaList({
    folder: folder !== "All" ? folder : undefined,
    search: debouncedSearch || undefined,
  });
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const filtered = useMemo(() => {
    return allMedia.filter((m) => {
      if (folder !== "All" && m.folder !== folder) return false;
      if (
        debouncedSearch &&
        !m.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allMedia, folder, debouncedSearch]);

  const folderCounts = useMemo(() => {
    return FOLDERS.reduce(
      (acc, f) => {
        if (f === "All") {
          acc[f] = allMedia.length;
        } else {
          acc[f] = allMedia.filter((m) => m.folder === f).length;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [allMedia]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="text-sm text-ink-3 mt-1">{allMedia.length} assets</p>
        </div>
        <Button className="gap-2 bg-accent text-bg hover:bg-accent/90">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-ink-4 uppercase tracking-wide px-2 py-1">
            Folders
          </div>
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                folder === f
                  ? "bg-bg-active text-ink font-medium"
                  : "text-ink-3 hover:bg-bg-sunken"
              }`}
            >
              <Folder
                className={`w-4 h-4 ${
                  folder === f ? "text-accent" : "text-ink-4"
                }`}
              />
              <span className="flex-1 text-left">{f}</span>
              <span className="text-xs font-mono text-ink-4">
                {folderCounts[f] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
            <Input
              placeholder="Search media…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-ink-3">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-3">No assets found</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {filtered.map((asset) => (
                <MediaTile
                  key={asset.id}
                  asset={asset}
                  onEdit={setSelectedAsset}
                  onDelete={(id) => deleteMedia.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <MediaDetailDialog
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onUpdate={(id, updates) => updateMedia.mutate({ id, updates })}
        isUpdating={updateMedia.isPending}
      />
    </div>
  );
}
