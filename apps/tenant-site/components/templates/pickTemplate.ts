import type { SiteTemplateSlug } from "@/lib/api";
import type { TemplateComponent } from "./types";
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

/** Pick the template component for a given slug; fall back to Editorial. */
export function pickTemplate(slug: SiteTemplateSlug | null): TemplateComponent {
  if (!slug) return EditorialLayout;
  return TEMPLATES[slug] ?? EditorialLayout;
}
