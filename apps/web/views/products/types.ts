export type ProductFormValues = {
  imsCode: string;
  name: string;
  categoryId: string;
  description: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  costPrice: string;
  mrp: string;
};

export type CategoryFormValues = {
  name: string;
  description: string;
};

export type ProductVariationForm = {
  color: string;
  stockQuantity: string;
  photos: Array<{ photoUrl: string; isPrimary: boolean }>;
};

export type ProductDiscountForm = {
  discountTypeName: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};
