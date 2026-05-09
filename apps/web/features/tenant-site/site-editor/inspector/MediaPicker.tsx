"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image as ImageIcon, X } from "lucide-react";
import { useMediaList } from "@/features/tenant-site/media/use-media";
import type { MediaAsset } from "@/features/tenant-site/media/types";

interface MediaPickerProps {
  value?: string;
  onChange: (url: string) => void;
}

export function MediaPicker({ value, onChange }: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: assets = [] } = useMediaList();

  const currentAsset = assets.find((a) => a.url === value);

  const handleSelect = (asset: MediaAsset) => {
    onChange(asset.url);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {currentAsset ? (
          <div className="relative w-16 h-16 rounded border border-line overflow-hidden bg-bg-sunken flex-shrink-0">
            {currentAsset.mimeType.startsWith("image/") ? (
              <Image
                src={currentAsset.url}
                alt={currentAsset.altText || currentAsset.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xl opacity-50">
                📎
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 rounded border border-dashed border-line bg-bg-sunken flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-6 h-6 text-ink-4" />
          </div>
        )}

        <div className="flex flex-col gap-2 flex-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsOpen(true)}
            className="h-7 text-xs"
          >
            {value ? "Change" : "Pick from library"}
          </Button>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange("")}
              className="h-7 text-xs text-danger hover:text-danger"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select media</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <MediaLibraryViewWithSelect onSelect={handleSelect} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaLibraryViewWithSelect({
  onSelect,
}: {
  onSelect: (asset: MediaAsset) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: allMedia = [] } = useMediaList();

  const filtered = allMedia.filter((m) => {
    if (search && !m.name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded text-sm flex-1"
          style={{
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg-elev)",
            color: "var(--ink)",
          }}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-ink-3">
            No media found
          </div>
        ) : (
          filtered.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelect(asset)}
              className="group relative rounded border border-line bg-bg-elev overflow-hidden hover:border-accent transition-colors"
            >
              <div className="aspect-square bg-bg-sunken relative overflow-hidden">
                {asset.mimeType.startsWith("image/") ? (
                  <Image
                    src={asset.url}
                    alt={asset.altText || asset.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl opacity-50">
                    📎
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <div className="font-mono text-2xs truncate text-ink">
                  {asset.name}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
