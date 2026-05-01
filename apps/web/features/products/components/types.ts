import type { FormEvent } from "react";

export type ProductFormValues = {
  imsCode: string;
  name: string;
  categoryId: string;
  subCategory: string;
  description: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  costPrice: string;
  mrp: string;
  vendorId?: string;
};

export type CategoryFormValues = {
  name: string;
  description: string;
  subcategories?: string[];
};

export type ProductVariationForm = {
  /** Existing variation ID (set when editing, undefined for new variations). */
  id?: string;
  stockQuantity: string;
  /** When editing, the location whose stock this value refers to */
  locationId?: string;
  /** Location display name for the form label */
  locationName?: string;
  /** Sub-variant names (e.g. S, M, L). When set, stock is managed per location per sub-variant. */
  subVariants: string[];
  photos: Array<{ photoUrl: string; isPrimary: boolean; fileName?: string }>;
  /** EAV: one value per attribute type (e.g. Color=Red, Size=M). */
  attributes?: Array<{ attributeTypeId: string; attributeValueId: string }>;
};

export type ProductDiscountForm = {
  discountTypeId: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

/**
 * Form return type with both legacy custom form state and RHF validation hooks.
 * Used by product forms which need a larger refactor.
 */
export interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  isLoading: boolean;
  handleChange: (name: keyof T, value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
  /** Set multiple form values at once (e.g. when loading a product for edit). Triggers re-render. */
  setValues: (values: Partial<T> | T) => void;
  /** Product wizard: run RHF validation for these fields (optional; adapter-only). */
  triggerValidation?: (fields?: (keyof T)[]) => Promise<boolean>;
  /** Product wizard: user clicked Next on this tab — allow inline errors for that step (adapter-only). */
  recordWizardValidationAttempt?: (tab: string) => void;
  /** Product wizard: show all step errors (e.g. final submit failed cross-tab validation). */
  revealAllWizardValidationErrors?: () => void;
}
