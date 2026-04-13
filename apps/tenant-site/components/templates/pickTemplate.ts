import type { SiteTemplateSlug } from "@/lib/api";
import type { TemplateComponent } from "./types";
import { MinimalLayout } from "./MinimalLayout";
import { StandardLayout } from "./StandardLayout";
import { LuxuryLayout } from "./LuxuryLayout";
import { BoutiqueLayout } from "./BoutiqueLayout";

const TEMPLATES: Record<string, TemplateComponent> = {
  minimal: MinimalLayout,
  standard: StandardLayout,
  luxury: LuxuryLayout,
  boutique: BoutiqueLayout,
};

/** Pick the template component for a given slug; fall back to Standard. */
export function pickTemplate(slug: SiteTemplateSlug | null): TemplateComponent {
  if (!slug) return StandardLayout;
  return TEMPLATES[slug] ?? StandardLayout;
}
