"use client";

/**
 * Widget registry — maps the string `widget:` value from
 * `INSPECTOR_OVERRIDES` to a real React component.
 *
 * The override system has always allowed `widget: "FooBuilder"`, but
 * SchemaDrivenForm previously ignored it and rendered a placeholder
 * (`Custom editor: FooBuilder`). Adding entries here is the second
 * half of "wire a custom field editor": override declares the name,
 * registry resolves it to a component, SchemaDrivenForm mounts it.
 *
 * Each widget receives a uniform `{ value, onChange, label }` shape;
 * builders that need block-aware metadata can read `blockKind` too.
 *
 * Adding a widget:
 *   1. Build the component file under `widgets/`.
 *   2. Add an entry below.
 *   3. Add `{ widget: "YourWidget" }` to the relevant inspector-overrides
 *      entry.
 */

import type React from "react";
import { NavMenuBuilder } from "./NavMenuBuilder";
import { FooterColumnsBuilder } from "./FooterColumnsBuilder";
import { SocialLinksBuilder } from "./SocialLinksBuilder";
import { PaymentIconsBuilder } from "./PaymentIconsBuilder";
import { FaqBuilder } from "./FaqBuilder";
import { TestimonialsBuilder } from "./TestimonialsBuilder";
import { LogoCloudBuilder } from "./LogoCloudBuilder";
import { TrustStripIconsBuilder } from "./TrustStripIconsBuilder";
import { CollectionCardsBuilder } from "./CollectionCardsBuilder";
import { GalleryBuilder } from "./GalleryBuilder";
import { TabsItemsBuilder } from "./TabsItemsBuilder";
import { AccordionItemsBuilder } from "./AccordionItemsBuilder";
import { AnnouncementItemsBuilder } from "./AnnouncementItemsBuilder";
import { BentoCellsBuilder } from "./BentoCellsBuilder";
import { FormFieldsBuilder } from "./FormFieldsBuilder";
import { LookbookPinsBuilder } from "./LookbookPinsBuilder";
import { PolicyStripBuilder } from "./PolicyStripBuilder";
import { PriceTiersBuilder } from "./PriceTiersBuilder";
import { SizeGuideMatrixBuilder } from "./SizeGuideMatrixBuilder";
import { StatsBuilder } from "./StatsBuilder";
import { UtilityBarBuilder } from "./UtilityBarBuilder";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomWidget = React.ComponentType<any>;

export const WIDGET_REGISTRY: Record<string, CustomWidget> = {
  NavMenuBuilder,
  FooterColumnsBuilder,
  SocialLinksBuilder,
  PaymentIconsBuilder,
  FaqBuilder,
  TestimonialsBuilder,
  LogoCloudBuilder,
  TrustStripIconsBuilder,
  CollectionCardsBuilder,
  GalleryBuilder,
  TabsItemsBuilder,
  AccordionItemsBuilder,
  AnnouncementItemsBuilder,
  BentoCellsBuilder,
  FormFieldsBuilder,
  LookbookPinsBuilder,
  PolicyStripBuilder,
  PriceTiersBuilder,
  SizeGuideMatrixBuilder,
  StatsBuilder,
  UtilityBarBuilder,
};

export function getCustomWidget(name: string): CustomWidget | null {
  return WIDGET_REGISTRY[name] ?? null;
}
