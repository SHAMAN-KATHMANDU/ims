"use client";

import { useCallback } from "react";
import {
  presignMedia,
  registerMediaAsset,
  type MediaPurpose,
} from "@/services/mediaService";

export type UploadToS3Options = {
  file: File;
  purpose: MediaPurpose;
  entityType?: "products" | "contacts" | "library" | "messages";
  entityId?: string;
  /** After PUT, create a MediaAsset row for the tenant library. */
  registerInLibrary?: boolean;
};

export function useS3DirectUpload() {
  const uploadFile = useCallback(async (options: UploadToS3Options) => {
    const mimeType = options.file.type || "application/octet-stream";
    const presign = await presignMedia({
      purpose: options.purpose,
      mimeType,
      fileName: options.file.name,
      entityType: options.entityType,
      entityId: options.entityId,
    });

    if (options.file.size > presign.maxBytes) {
      throw new Error(
        `File is too large (max ${Math.round(presign.maxBytes / (1024 * 1024))} MB)`,
      );
    }

    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      body: options.file,
      headers: { "Content-Type": mimeType },
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed (${putRes.status})`);
    }

    if (options.registerInLibrary) {
      await registerMediaAsset({
        storageKey: presign.key,
        publicUrl: presign.publicUrl,
        fileName: options.file.name,
        mimeType,
        byteSize: options.file.size,
        purpose: options.purpose,
      });
    }

    return {
      publicUrl: presign.publicUrl,
      key: presign.key,
      maxBytes: presign.maxBytes,
    };
  }, []);

  return { uploadFile };
}
