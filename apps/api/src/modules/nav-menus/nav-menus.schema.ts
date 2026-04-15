/**
 * nav-menus request/response schemas.
 *
 * A NavMenu row is keyed by (tenantId, slot). For the header slot
 * ("header-primary") we store a full NavConfig; footer/drawer slots store a
 * light NavItemsOnly payload. The API accepts either shape on PUT — the
 * caller picks based on the slot. We don't enforce "full config for header,
 * items-only for footer" as a hard rule because it would bite us when a
 * future slot wants full config.
 */

import { z } from "zod";
import { NAV_SLOTS, NavConfigSchema, NavItemsOnlySchema } from "@repo/shared";

export const NavSlotEnum = z.enum(NAV_SLOTS);

/**
 * Upsert payload. `items` is one of:
 *   - a full NavConfig (for header-primary)
 *   - a NavItemsOnly (for footer-1 / footer-2 / mobile-drawer)
 *
 * The validator accepts either; the service persists whatever it was given
 * and the renderer decodes it with the slot's expected shape.
 */
export const UpsertNavMenuSchema = z
  .object({
    slot: NavSlotEnum,
    items: z.union([NavConfigSchema, NavItemsOnlySchema]),
  })
  .strict();

export type UpsertNavMenuInput = z.infer<typeof UpsertNavMenuSchema>;
