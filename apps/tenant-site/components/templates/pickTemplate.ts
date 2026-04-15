import type { SiteTemplateSlug } from "@/lib/api";
import type { TemplateComponent } from "./types";
import { MinimalLayout } from "./MinimalLayout";
import { StandardLayout } from "./StandardLayout";
import { LuxuryLayout } from "./LuxuryLayout";
import { BoutiqueLayout } from "./BoutiqueLayout";
import { EditorialLayout } from "./EditorialLayout";
import { OrganicLayout } from "./OrganicLayout";
import { DarkLayout } from "./DarkLayout";
import { BrutalistLayout } from "./BrutalistLayout";
import { ZenLayout } from "./ZenLayout";
import { CoastalLayout } from "./CoastalLayout";
import { ApothecaryLayout } from "./ApothecaryLayout";
import { RetroLayout } from "./RetroLayout";
import { ArtisanLayout } from "./ArtisanLayout";
import { GalleryLayout } from "./GalleryLayout";

const TEMPLATES: Record<string, TemplateComponent> = {
  // Phase A — original four
  minimal: MinimalLayout,
  standard: StandardLayout,
  luxury: LuxuryLayout,
  boutique: BoutiqueLayout,
  // Phase C.4 — 10 new bespoke layouts
  editorial: EditorialLayout,
  organic: OrganicLayout,
  dark: DarkLayout,
  brutalist: BrutalistLayout,
  zen: ZenLayout,
  coastal: CoastalLayout,
  apothecary: ApothecaryLayout,
  retro: RetroLayout,
  artisan: ArtisanLayout,
  gallery: GalleryLayout,
};

/** Pick the template component for a given slug; fall back to Standard. */
export function pickTemplate(slug: SiteTemplateSlug | null): TemplateComponent {
  if (!slug) return StandardLayout;
  return TEMPLATES[slug] ?? StandardLayout;
}
