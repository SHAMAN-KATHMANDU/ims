"use client";

import { useState, useMemo } from "react";
import { Copy, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import {
  useMediaAssets,
  useUpdateMediaAsset,
  useDeleteMediaAsset,
} from "../../hooks/useMediaLibraryQuery";

interface MediaDetailDrawerProps {
  assetId: string;
  onClose: () => void;
}

export function MediaDetailDrawer({
  assetId,
  onClose,
}: MediaDetailDrawerProps) {
  const { toast } = useToast();
  const mediaQuery = useMediaAssets();
  const updateMutation = useUpdateMediaAsset();
  const deleteMutation = useDeleteMediaAsset();
  const [fileName, setFileName] = useState("");
  const [altText, setAltText] = useState("");

  const asset = useMemo(
    () => mediaQuery.data?.items.find((a) => a.id === assetId),
    [mediaQuery.data?.items, assetId],
  );

  // Initialize form on mount
  if (asset && !fileName) {
    setFileName(asset.fileName);
  }

  const handleSave = async () => {
    if (!fileName.trim()) return;
    await updateMutation.mutateAsync({
      id: assetId,
      data: { fileName },
    });
  };

  const handleCopyUrl = () => {
    if (asset) {
      navigator.clipboard.writeText(asset.publicUrl);
      toast({ title: "URL copied" });
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this asset?")) {
      await deleteMutation.mutateAsync(assetId);
      onClose();
    }
  };

  if (!asset) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent>
          <div className="p-4 text-sm text-gray-500">Asset not found</div>
        </SheetContent>
      </Sheet>
    );
  }

  const isImage = asset.mimeType.startsWith("image/");

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Asset Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          {/* Preview */}
          <div className="border rounded aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
            {isImage ? (
              <Image
                src={asset.publicUrl}
                alt={asset.fileName}
                width={256}
                height={256}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video src={asset.publicUrl} className="max-w-full max-h-full" />
            )}
          </div>

          {/* File name */}
          <div>
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          {/* Alt text (images only) */}
          {isImage && (
            <div>
              <Label htmlFor="altText">Alt Text</Label>
              <Textarea
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility"
                rows={3}
              />
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{asset.mimeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">
                {asset.byteSize ? (asset.byteSize / 1024).toFixed(1) : "?"} KB
              </span>
            </div>
          </div>

          {/* Public URL */}
          <div>
            <Label htmlFor="url">Public URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                readOnly
                value={asset.publicUrl}
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              Save Changes
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
