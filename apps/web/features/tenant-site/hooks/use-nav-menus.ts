"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NavConfig, NavSlot, FooterConfig } from "@repo/shared";
import {
  listNavMenus,
  upsertNavMenu,
  deleteNavMenu,
  type NavMenuRow,
} from "../services/nav-menus.service";

export const navMenuKeys = {
  all: ["nav-menus"] as const,
  list: () => [...navMenuKeys.all, "list"] as const,
};

export function useNavMenus() {
  return useQuery({
    queryKey: navMenuKeys.list(),
    queryFn: listNavMenus,
  });
}

export function useUpsertNavMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slot,
      items,
    }: {
      slot: NavSlot;
      items: NavConfig | { items: unknown[] } | FooterConfig;
    }) => upsertNavMenu(slot, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: navMenuKeys.all });
    },
  });
}

export function useDeleteNavMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slot: NavSlot) => deleteNavMenu(slot),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: navMenuKeys.all });
    },
  });
}

export function pickMenuForSlot(
  menus: NavMenuRow[] | undefined,
  slot: NavSlot,
): NavMenuRow | null {
  if (!menus) return null;
  return menus.find((m) => m.slot === slot) ?? null;
}
