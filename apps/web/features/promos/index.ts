export { PromoPage } from "./components/index";
export { NewPromoPage } from "./components/NewPromoPage";
export { EditPromoPage } from "./components/EditPromoPage";
export {
  usePromosPaginated,
  usePromo,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  promoKeys,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "./hooks/use-promos";
export type {
  PromoCode,
  PromoListParams,
  PaginatedPromosResponse,
  CreateOrUpdatePromoData,
} from "./hooks/use-promos";
export {
  getPromos,
  getPromoById,
  createPromo,
  updatePromo,
  deletePromo,
  searchPromoByCode,
} from "./services/promo.service";
