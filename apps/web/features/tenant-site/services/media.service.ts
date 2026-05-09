import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface MediaAsset {
  id: string;
  tenantId: string;
  storageKey: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  byteSize?: number;
  purpose: "product_photo" | "contact_attachment" | "library" | "message_media";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  altText?: string | null;
  folder?: string | null;
}

export interface MediaPresignResult {
  presignedUrl: string;
  key: string;
  publicUrl: string;
  headers?: Record<string, string>;
}

export interface MediaListParams {
  limit?: number;
  cursor?: string;
  purpose?:
    | "product_photo"
    | "contact_attachment"
    | "library"
    | "message_media";
  mimePrefix?: string;
  folder?: string;
}

export interface MediaListResponse {
  items: MediaAsset[];
  nextCursor?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface PresignPayload {
  purpose: "product_photo" | "contact_attachment" | "library" | "message_media";
  mimeType: string;
  contentLength: number;
  fileName?: string;
  entityType?: "products" | "contacts" | "library" | "messages";
  entityId?: string;
}

export interface RegisterAssetPayload {
  storageKey: string;
  publicUrl?: string;
  fileName: string;
  mimeType: string;
  byteSize?: number;
  purpose: "product_photo" | "contact_attachment" | "library" | "message_media";
}

export const mediaService = {
  async presignUpload(payload: PresignPayload): Promise<MediaPresignResult> {
    try {
      const { data } = await api.post<{
        presignedUrl: string;
        key: string;
        publicUrl: string;
        headers?: Record<string, string>;
      }>("/media/presign", payload);
      return {
        presignedUrl: data.presignedUrl,
        key: data.key,
        publicUrl: data.publicUrl,
        headers: data.headers,
      };
    } catch (error) {
      throw handleApiError(error, "media presign");
    }
  },

  async uploadToS3(
    presignedUrl: string,
    file: File,
    headers?: Record<string, string>,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<void> {
    try {
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percent,
            });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("S3 upload failed: network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("S3 upload was cancelled"));
        });

        xhr.open("PUT", presignedUrl);

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("S3 upload failed");
    }
  },

  async registerAsset(payload: RegisterAssetPayload): Promise<MediaAsset> {
    try {
      const { data } = await api.post<{ asset: MediaAsset }>(
        "/media/assets",
        payload,
      );
      return data.asset;
    } catch (error) {
      throw handleApiError(error, "media register");
    }
  },

  async listAssets(params?: MediaListParams): Promise<MediaListResponse> {
    try {
      const { data } = await api.get<{
        items: MediaAsset[];
        nextCursor?: string;
      }>("/media/assets", { params });
      return {
        items: data.items ?? [],
        nextCursor: data.nextCursor,
      };
    } catch (error) {
      throw handleApiError(error, "media list");
    }
  },

  async getAsset(id: string): Promise<MediaAsset> {
    try {
      const { data } = await api.get<{ asset: MediaAsset }>(
        `/media/assets/${id}`,
      );
      return data.asset;
    } catch (error) {
      throw handleApiError(error, "media get");
    }
  },

  async updateAsset(
    id: string,
    payload: {
      fileName?: string;
      altText?: string | null;
      folder?: string | null;
    },
  ): Promise<MediaAsset> {
    try {
      const { data } = await api.patch<{ asset: MediaAsset }>(
        `/media/assets/${id}`,
        payload,
      );
      return data.asset;
    } catch (error) {
      throw handleApiError(error, "media update");
    }
  },

  async listFolders(): Promise<string[]> {
    try {
      const { data } = await api.get<{ folders: string[] }>("/media/folders");
      return data.folders;
    } catch (error) {
      throw handleApiError(error, "media folders");
    }
  },

  async deleteAsset(id: string): Promise<void> {
    try {
      await api.delete(`/media/assets/${id}`);
    } catch (error) {
      throw handleApiError(error, "media delete");
    }
  },

  async uploadFile(
    file: File,
    purpose: PresignPayload["purpose"],
    onProgress?: (progress: UploadProgress) => void,
    entityType?: PresignPayload["entityType"],
    entityId?: string,
  ): Promise<MediaAsset> {
    const presignResult = await this.presignUpload({
      purpose,
      mimeType: file.type,
      contentLength: file.size,
      fileName: file.name,
      entityType,
      entityId,
    });

    await this.uploadToS3(
      presignResult.presignedUrl,
      file,
      presignResult.headers,
      onProgress,
    );

    return this.registerAsset({
      storageKey: presignResult.key,
      publicUrl: presignResult.publicUrl,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      purpose,
    });
  },
};
