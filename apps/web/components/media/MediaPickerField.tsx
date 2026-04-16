"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
import { useToast } from "@/hooks/useToast";
import { useS3DirectUpload } from "@/hooks/useS3DirectUpload";
import { getApiErrorMessage } from "@/lib/api-error";
import { MediaLibraryPickerDialog } from "./MediaLibraryPickerDialog";
import { ImageCropDialog } from "./ImageCropDialog";

/**
 * Field that combines three ways to set a media URL:
 *   1. Pick from the tenant's existing library (MediaLibraryPickerDialog)
 *   2. Upload a new file (direct S3 PUT, registered as a "library" asset)
 *   3. Paste a URL manually (fallback that always works)
 *
 * When the `MEDIA_UPLOAD` feature flag is off, the dialog + upload are hidden
 * and the field collapses to a plain URL input — safe to drop in anywhere
 * without worrying about whether media is wired up in that environment.
 */
export type MediaPickerFieldProps = {
  /** Current value: a public image URL, or empty string. */
  value: string;
  onChange: (next: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Accept attribute for the file input (e.g. "image/*"). */
  accept?: string;
  /** Optional preview size in px. */
  previewSize?: number;
  /** Optional help text shown under the controls. */
  helperText?: string;
};

export function MediaPickerField({
  value,
  onChange,
  id,
  placeholder = "https://…",
  disabled,
  accept = "image/*",
  previewSize = 64,
  helperText,
}: MediaPickerFieldProps) {
  const { toast } = useToast();
  const mediaUploadEnabled = useEnvFeatureFlag(EnvFeature.MEDIA_UPLOAD);
  const { uploadFile } = useS3DirectUpload();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile({
        file,
        purpose: "library",
        registerInLibrary: true,
      });
      if (file.type.startsWith("image/")) {
        setCropUrl(result.publicUrl);
      } else {
        onChange(result.publicUrl);
      }
      toast({ title: "Uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {value ? (
          <div
            className="relative shrink-0 overflow-hidden rounded border bg-muted"
            style={{ height: previewSize, width: previewSize }}
          >
            {}
            <NextImage
              src={value}
              alt="preview"
              fill
              className="object-cover"
              sizes={`${previewSize}px`}
              unoptimized
            />
          </div>
        ) : (
          <div
            className="flex shrink-0 items-center justify-center rounded border border-dashed bg-muted/40 text-muted-foreground"
            style={{ height: previewSize, width: previewSize }}
          >
            <ImageIcon className="h-5 w-5" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || uploading}
          />

          {mediaUploadEnabled && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => setPickerOpen(true)}
              >
                <ImageIcon className="mr-1.5 h-4 w-4" />
                Browse library
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              {value && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled || uploading}
                  onClick={() => onChange("")}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {helperText && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
        </div>
      </div>

      {mediaUploadEnabled && (
        <MediaLibraryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(asset) => {
            if (asset.publicUrl.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
              setCropUrl(asset.publicUrl);
            } else {
              onChange(asset.publicUrl);
            }
          }}
        />
      )}

      {cropUrl && (
        <ImageCropDialog
          open={!!cropUrl}
          onOpenChange={(open) => {
            if (!open) setCropUrl(null);
          }}
          imageUrl={cropUrl}
          onComplete={(url) => {
            onChange(url);
            setCropUrl(null);
          }}
        />
      )}
    </div>
  );
}
