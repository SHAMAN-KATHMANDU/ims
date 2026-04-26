/**
 * Sale structure for receipt generation.
 * Must match the data returned by saleService.getSaleById().
 */
export type SaleWithIncludes = {
  saleCode: string;
  createdAt: Date | string;
  subtotal: unknown;
  discount: unknown;
  promoDiscount?: unknown;
  total: unknown;
  notes?: string | null;
  isCreditSale?: boolean;
  promoCodesUsed?: string[] | unknown | null;
  tenant?: {
    id?: string;
    name: string;
    settings?: unknown;
  } | null;
  tenantId?: string;
  location?:
    | { id: string; name: string; address?: string | null }
    | { id: string; name: string };
  member?: {
    id: string;
    phone: string;
    name?: string | null;
    address?: string | null;
  } | null;
  createdBy: { id: string; username: string; role?: string };
  contact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  payments?: Array<{
    id: string;
    method: string;
    amount: unknown;
    createdAt?: Date;
  }>;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: unknown;
    discountPercent: unknown;
    discountAmount?: unknown;
    lineTotal: unknown;
    variation: {
      product: { id: string; name: string; category?: { name: string } | null };
      attributes?: Array<{
        attributeType: { name: string };
        attributeValue: { value: string };
      }>;
    };
    subVariation?: { id: string; name: string } | null;
  }>;
};

/** Layout context passed to all receipt components */
export interface ReceiptContext {
  margin: number;
  usableWidth: number;
  pageBottom: number;
  footerTop: number;
  tableRight: number;
  totX: number;
  midX: number;
  /** When true, keep receipt on single page (≤10 items) */
  singlePageMode: boolean;
}
