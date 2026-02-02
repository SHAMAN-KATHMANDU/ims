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
};

export type ProductVariationForm = {
  color: string;
  stockQuantity: string;
  /** Sub-variant names (e.g. S, M, L). When set, stock is managed per location per sub-variant. */
  subVariants: string[];
  photos: Array<{ photoUrl: string; isPrimary: boolean }>;
};

export type ProductDiscountForm = {
  discountTypeName: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};
