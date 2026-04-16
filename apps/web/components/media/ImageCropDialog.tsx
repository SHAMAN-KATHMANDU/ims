"use client";

/**
 * ImageCropDialog — shown after an image is selected/uploaded in
 * MediaPickerField. The user can crop to a preset aspect ratio or
 * freeform, then confirm. The cropped result is drawn onto a canvas,
 * exported as a blob, and uploaded as a new asset via the S3 direct
 * upload hook. If the user skips, the original URL is used as-is.
 */

import { useCallback, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useS3DirectUpload } from "@/hooks/useS3DirectUpload";
import { getApiErrorMessage } from "@/lib/api-error";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The original image URL to crop. */
  imageUrl: string;
  /** Called with the final URL (cropped or original if skipped). */
  onComplete: (url: string) => void;
};

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onComplete,
}: Props) {
  const { toast } = useToast();
  const { uploadFile } = useS3DirectUpload();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imgRef.current = img;
      if (aspect) {
        const c = centerCrop(
          makeAspectCrop(
            { unit: "%", width: 80 },
            aspect,
            img.naturalWidth,
            img.naturalHeight,
          ),
          img.naturalWidth,
          img.naturalHeight,
        );
        setCrop(c);
      }
    },
    [aspect],
  );

  const handleSkip = () => {
    onComplete(imageUrl);
    onOpenChange(false);
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) {
      handleSkip();
      return;
    }

    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          "image/jpeg",
          0.92,
        );
      });

      const file = new File([blob], `cropped-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const result = await uploadFile({
        file,
        purpose: "library",
        registerInLibrary: true,
      });

      onComplete(result.publicUrl);
      onOpenChange(false);
      toast({ title: "Image cropped and uploaded" });
    } catch (err) {
      toast({
        title: "Crop failed",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 pb-2">
          {ASPECT_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant={aspect === preset.value ? "default" : "outline"}
              onClick={() => setAspect(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-center overflow-auto rounded-md border bg-muted/30 p-2">
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            onComplete={setCompletedCrop}
            aspect={aspect}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: "60vh", maxWidth: "100%" }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            Skip crop
          </Button>
          <Button onClick={handleCrop} disabled={saving}>
            {saving ? "Uploading…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
