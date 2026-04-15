import type {
  PublicSite,
  PublicProduct,
  PublicCategory,
  PublicBlogPostListItem,
  PublicNavPage,
} from "@/lib/api";
import type { SectionFlags } from "@/lib/sections";

export interface TemplateProps {
  page: "home" | "products" | "product" | "contact";
  site: PublicSite;
  products: PublicProduct[];
  categories: PublicCategory[];
  /** Tenant-authored pages the site header should list. Empty array OK. */
  navPages: PublicNavPage[];
  /** Parsed SiteConfig.features with defaults — templates branch on these. */
  sections: SectionFlags;
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
