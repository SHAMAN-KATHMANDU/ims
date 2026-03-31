"use client";

import { inferMimeFromFileName } from "@repo/shared";
import { useCallback } from "react";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
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

function putErrorMessage(status: number): string {
  if (status === 403) {
    return "Upload link expired or invalid; request a new upload link.";
  }
  return `Upload failed (${status})`;
}

async function putToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<Response> {
  return fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(file.size),
    },
  });
}

export function useS3DirectUpload() {
  const mediaUploadEnabled = useEnvFeatureFlag(EnvFeature.MEDIA_UPLOAD);

  const uploadFile = useCallback(
    async (options: UploadToS3Options) => {
      if (!mediaUploadEnabled) {
        throw new Error("Media upload is disabled in this environment.");
      }

      const mimeType =
        options.file.type?.trim() ||
        inferMimeFromFileName(options.file.name) ||
        "application/octet-stream";

      const runOnce = async () => {
        const presign = await presignMedia({
          purpose: options.purpose,
          mimeType,
          fileName: options.file.name,
          contentLength: options.file.size,
          entityType: options.entityType,
          entityId: options.entityId,
        });

        if (options.file.size > presign.maxBytes) {
          throw new Error(
            `File is too large (max ${Math.round(presign.maxBytes / (1024 * 1024))} MB)`,
          );
        }

        const putRes = await putToPresignedUrl(
          presign.uploadUrl,
          options.file,
          presign.contentType,
        );
        return { presign, putRes };
      };

      let { presign, putRes } = await runOnce();
      if (!putRes.ok && putRes.status === 403) {
        ({ presign, putRes } = await runOnce());
      }

      if (!putRes.ok) {
        throw new Error(putErrorMessage(putRes.status));
      }

      let mediaAssetId: string | undefined;
      const shouldRegister =
        options.registerInLibrary === true ||
        options.purpose === "product_photo";
      if (shouldRegister) {
        const reg = await registerMediaAsset({
          storageKey: presign.key,
          fileName: options.file.name,
          mimeType: presign.contentType,
          byteSize: options.file.size,
          purpose: options.purpose,
        });
        mediaAssetId = reg.asset.id;
      }

      return {
        publicUrl: presign.publicUrl,
        fileName: options.file.name,
        key: presign.key,
        maxBytes: presign.maxBytes,
        contentType: presign.contentType,
        mediaAssetId,
      };
    },
    [mediaUploadEnabled],
  );

  return { uploadFile, mediaUploadEnabled };
}
