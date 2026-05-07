"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRegisterMediaAsset,
  usePresignMedia,
} from "../../hooks/useMediaLibraryQuery";

export function MediaUploadDropZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const presignMutation = usePresignMedia();
  const registerMutation = useRegisterMediaAsset();

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const presignRes = await presignMutation.mutateAsync({
          purpose: "library",
          mimeType: file.type,
          fileName: file.name,
          contentLength: file.size,
        });

        // Upload to S3
        await fetch(presignRes.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": presignRes.contentType },
        });

        // Register in backend
        await registerMutation.mutateAsync({
          storageKey: presignRes.key,
          publicUrl: presignRes.publicUrl,
          fileName: file.name,
          mimeType: presignRes.contentType,
          byteSize: file.size,
          purpose: "library",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      role="region"
      aria-label="File upload drop zone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
        isDragging
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 bg-gray-50 hover:border-gray-400",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading...
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Drop files or click to upload
          </p>
          <p className="text-xs text-gray-500 mt-1">Images and videos</p>
        </button>
      )}
    </div>
  );
}
