import type {
  PublicSite,
  PublicProduct,
  PublicCategory,
  PublicBlogPostListItem,
} from "@/lib/api";

export interface TemplateProps {
  page: "home" | "products" | "product" | "contact";
  site: PublicSite;
  products: PublicProduct[];
  categories: PublicCategory[];
  /** Latest published blog posts for the homepage "From the journal" section. */
  featuredBlogPosts?: PublicBlogPostListItem[];
  pagination?: {
    page: number;
    total: number;
    limit: number;
  };
  activeProduct?: PublicProduct;
}

export type TemplateComponent = (props: TemplateProps) => React.ReactNode;
