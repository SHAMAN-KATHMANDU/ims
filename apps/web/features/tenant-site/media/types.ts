export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
  folder: string;
  mimeType: string;
  uploadedAt: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  count: number;
}
