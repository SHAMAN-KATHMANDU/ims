import api from "@/lib/axios";
import { unwrapApiData } from "@/lib/apiResponse";

export type MediaPurpose = "product_photo" | "contact_attachment" | "library";

export type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  /** Normalized Content-Type; use this on the PUT and on register. */
  contentType: string;
  expiresAt: string;
  maxBytes: number;
  requiresCompletion: boolean;
};

export async function presignMedia(body: {
  purpose: MediaPurpose;
  mimeType: string;
  fileName?: string;
  contentLength: number;
  entityType?: "products" | "contacts" | "library" | "messages";
  entityId?: string;
}): Promise<PresignResponse> {
  const res = await api.post("/media/presign", body, {
    skipGlobalErrorToast: true,
  } as Parameters<typeof api.post>[2]);
  return unwrapApiData<PresignResponse>(res.data);
}

export type MediaAssetRow = {
  id: string;
  tenantId: string;
  storageKey: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  byteSize: number | null;
  purpose: string;
  uploadedById: string;
  createdAt: string;
};

export async function listMediaAssets(params?: {
  limit?: number;
  cursor?: string;
}): Promise<{ items: MediaAssetRow[]; nextCursor: string | null }> {
  const res = await api.get("/media/assets", { params });
  return unwrapApiData<{ items: MediaAssetRow[]; nextCursor: string | null }>(
    res.data,
  );
}

export async function registerMediaAsset(body: {
  storageKey: string;
  publicUrl?: string;
  fileName: string;
  mimeType: string;
  byteSize?: number;
  purpose: MediaPurpose;
}): Promise<{ asset: MediaAssetRow }> {
  const res = await api.post("/media/assets", body);
  return unwrapApiData<{ asset: MediaAssetRow }>(res.data);
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await api.delete(`/media/assets/${id}`);
  unwrapApiData<{ deleted: boolean }>(res.data);
}
