import type { PublicSite, PublicProduct, PublicCategory } from "@/lib/api";

export interface TemplateProps {
  page: "home" | "products" | "product" | "contact";
  site: PublicSite;
  products: PublicProduct[];
  categories: PublicCategory[];
  pagination?: {
    page: number;
    total: number;
    limit: number;
  };
  activeProduct?: PublicProduct;
}

export type TemplateComponent = (props: TemplateProps) => React.ReactNode;
