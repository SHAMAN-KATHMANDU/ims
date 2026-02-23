export type ProductFormValues = {
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
};

export type ProductVariationForm = {
  /** Existing variation ID (set when editing, undefined for new variations). */
  id?: string;
  stockQuantity: string;
  /** Sub-variant names (e.g. S, M, L). When set, stock is managed per location per sub-variant. */
  subVariants: string[];
  photos: Array<{ photoUrl: string; isPrimary: boolean }>;
  /** Unique per-tenant IMS code for this variation. */
  imsCode?: string;
  /** EAV: one value per attribute type (e.g. Color=Red, Size=M). */
  attributes?: Array<{ attributeTypeId: string; attributeValueId: string }>;
};

export type ProductDiscountForm = {
  discountTypeName: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};
