/**
 * Sales feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export type SaleType = "GENERAL" | "MEMBER";

export type PaymentMethod = "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface SaleItem {
  id: string;
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount?: number;
  totalMrp?: number;
  lineTotal: number;
  variation: {
    id: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
      category?: {
        id: string;
        name: string;
      };
    };
    attributes?: Array<{
      attributeType: { name: string };
      attributeValue: { value: string };
    }>;
    photos?: {
      id: string;
      photoUrl: string;
      isPrimary: boolean;
    }[];
  };
}

export interface SalePaymentDetail {
  id: string;
  method: PaymentMethod;
  amount: number;
  createdAt?: string;
}

export interface Sale {
  id: string;
  saleCode: string;
  type: SaleType;
  isCreditSale: boolean;
  locationId: string;
  memberId?: string;
  contactId?: string | null;
  subtotal: number;
  discount: number;
  promoDiscount?: number;
  promoCodesUsed?: string[];
  total: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  location: {
    id: string;
    name: string;
  };
  member?: {
    id: string;
    phone: string;
    name?: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  createdBy: {
    id: string;
    username: string;
    role?: string;
  };
  payments?: SalePaymentDetail[];
  items?: SaleItem[];
  _count?: {
    items: number;
  };
  parentSaleId?: string | null;
  revisionNo?: number;
  isLatest?: boolean;
  editReason?: string | null;
  editedAt?: string | null;
}

export interface SalesListParams {
  page?: number;
  limit?: number;
  locationId?: string;
  createdById?: string;
  type?: SaleType;
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type { PaginationMeta };

export interface PaginatedSalesResponse {
  data: Sale[];
  pagination: PaginationMeta;
}

export interface CreateSaleItem {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  discountId?: string | null;
  promoCode?: string;
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  discountReason?: string;
}

export interface CreateSaleData {
  locationId: string;
  memberPhone?: string;
  memberName?: string;
  contactId?: string | null;
  items: CreateSaleItem[];
  notes?: string;
  payments?: SalePayment[];
  isCreditSale?: boolean;
}

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  generalSales: {
    count: number;
    revenue: number;
  };
  memberSales: {
    count: number;
    revenue: number;
  };
}

export interface LocationSalesStat {
  locationId: string;
  locationName: string;
  totalSales: number;
  totalRevenue: number;
}

export interface DailySalesStat {
  date: string;
  total: number;
  count: number;
  general: number;
  member: number;
}

export interface SalePreviewResponse {
  subtotal: number;
  discount: number;
  total: number;
  promoDiscount?: number;
}

export interface SaleBulkUploadError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface SaleBulkUploadSummary {
  total: number;
  created: number;
  skipped: number;
  errors: number;
}

export interface CreatedSale {
  id: string;
  saleCode: string;
  itemsCount: number;
}

export interface SkippedSale {
  saleId: string | null;
  reason: string;
}

export interface SaleBulkUploadResponse {
  message: string;
  summary: SaleBulkUploadSummary;
  created: CreatedSale[];
  skipped: SkippedSale[];
  errors: SaleBulkUploadError[];
}
