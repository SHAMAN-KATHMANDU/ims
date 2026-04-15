/**
 * Nav Menus Service — tenant-scoped /nav-menus/* endpoints.
 *
 * Mirrors the apps/api/src/modules/nav-menus shape. The wire types for
 * NavConfig / NavItem come from @repo/shared so the editor and renderer
 * agree on the schema without any duplication.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { NavConfig, NavSlot } from "@repo/shared";

export type { NavConfig, NavItem, NavSlot } from "@repo/shared";

export interface NavMenuRow {
  id: string;
  tenantId: string;
  slot: NavSlot | string;
  /** NavConfig for header-primary; { items: NavItem[] } for footer/drawer. */
  items: unknown;
  createdAt: string;
  updatedAt: string;
}

export async function listNavMenus(): Promise<NavMenuRow[]> {
  try {
    const response = await api.get<{ menus: NavMenuRow[] }>("/nav-menus");
    return response.data.menus ?? [];
  } catch (error) {
    handleApiError(error, "fetch nav menus");
  }
}

export async function upsertNavMenu(
  slot: NavSlot,
  items: NavConfig | { items: unknown[] },
): Promise<NavMenuRow> {
  try {
    const response = await api.put<{ menu: NavMenuRow }>("/nav-menus", {
      slot,
      items,
    });
    return response.data.menu;
  } catch (error) {
    handleApiError(error, "save nav menu");
  }
}

export async function deleteNavMenu(slot: NavSlot): Promise<void> {
  try {
    await api.delete(`/nav-menus/${slot}`);
  } catch (error) {
    handleApiError(error, "delete nav menu");
  }
}
