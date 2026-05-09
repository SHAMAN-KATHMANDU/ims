export interface Offer {
  id: string;
  code: string;
  title: string;
  type: "Discount" | "Comp" | "Event" | "Freeshipment";
  value: string;
  uses: number;
  cap: number | null;
  status: "draft" | "active" | "scheduled" | "ended";
  window: string;
  appliesToAll: boolean;
  appliesTo?: string[];
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  perCustomerLimit?: number;
}

export interface CreateOfferData {
  code: string;
  title: string;
  type: "Discount" | "Comp" | "Event" | "Freeshipment";
  value: string;
  appliesToAll: boolean;
  appliesTo?: string[];
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  perCustomerLimit?: number;
}

export type UpdateOfferData = Partial<CreateOfferData>;

export interface OfferFormValues {
  code: string;
  title: string;
  type: "Discount" | "Comp" | "Event" | "Freeshipment";
  value: string;
  appliesToAll: boolean;
  appliesTo: string[];
  startDate: string;
  endDate: string;
  maxUses: string;
  perCustomerLimit: string;
}
