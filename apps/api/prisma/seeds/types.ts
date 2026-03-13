/**
 * Context passed between seed modules for a single tenant.
 * Each module receives context, creates data, and returns updated context.
 */
export interface SeedContext {
  tenantId: string;
  slug: string;
  subscriptionId: string;
  userIds: Record<string, string>;
  categoryIds: Record<string, string>;
  subCategoryIds: Record<string, string>;
  vendorIds: string[];
  locationIds: Record<string, string>;
  attributeTypeIds: Record<string, string>;
  attributeValueIds: Record<string, string[]>;
  discountTypeIds: Record<string, string>;
  productIds: string[];
  variationIds: string[];
  /** productId -> variation ids for that product */
  variationIdsByProductId: Record<string, string[]>;
  subVariationIds: Record<string, string[]>;
  memberIds: string[];
  transferIds: string[];
  saleIds: string[];
  promoCodeIds: string[];
  companyIds: string[];
  contactTagIds: Record<string, string>;
  contactIds: string[];
  pipelineId: string;
  leadIds: string[];
  dealIds: string[];
  taskIds: string[];
  activityIds: string[];
}

export function createEmptyContext(
  tenantId: string,
  slug: string,
  subscriptionId: string,
): SeedContext {
  return {
    tenantId,
    slug,
    subscriptionId,
    userIds: {},
    categoryIds: {},
    subCategoryIds: {},
    vendorIds: [],
    locationIds: {},
    attributeTypeIds: {},
    attributeValueIds: {},
    discountTypeIds: {},
    productIds: [],
    variationIds: [],
    variationIdsByProductId: {},
    subVariationIds: {},
    memberIds: [],
    transferIds: [],
    saleIds: [],
    promoCodeIds: [],
    companyIds: [],
    contactTagIds: {},
    contactIds: [],
    pipelineId: "",
    leadIds: [],
    dealIds: [],
    taskIds: [],
    activityIds: [],
  };
}
