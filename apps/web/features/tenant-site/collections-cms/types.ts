export interface CollectionProduct {
  id: string;
  title: string;
  price: number;
  sku: string;
  stock: number;
  thumbnail?: string;
}

export interface CollectionDetail {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  isActive: boolean;
  sort: number;
  productIds: string[];
  products?: CollectionProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionPayload {
  slug: string;
  title: string;
  subtitle?: string;
  isActive?: boolean;
}

export interface UpdateCollectionPayload {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  isActive?: boolean;
  sort?: number;
}
