"use client";

/**
 * `useRoleEditorState` — the hook that holds the RHF form state for
 * RoleEditor AND orchestrates the bitset math (toggle, cascade, dirty
 * counting) in one cohesive unit so the RoleEditor component stays almost
 * purely presentational.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ADMINISTRATOR_BIT,
  PERMISSION_BY_KEY,
  PERMISSIONS,
  PERMISSIONS_BY_MODULE,
  type ModuleId,
  type PermissionDef,
} from "@repo/shared";
import {
  equals,
  fromBase64,
  hasBit,
  popcountBits,
  toBase64,
  writeBit,
} from "@/features/permissions";
import { RoleEditorSchema, type RoleEditorInput } from "../validation";

export interface RoleEditorInitial {
  name: string;
  priority: number;
  color: string | null;
  /** base64-encoded 64-byte permission bitset (or "" for empty). */
  permissions: string;
}

export type CascadeDialog =
  | { kind: "none" }
  | {
      kind: "dangerous";
      def: PermissionDef;
      onConfirm: () => void;
    }
  | {
      kind: "disabling-implied";
      def: PermissionDef;
      dependents: PermissionDef[];
      onConfirm: () => void;
    };

function buildReverseImpliesIndex(): Map<string, PermissionDef[]> {
  const index = new Map<string, PermissionDef[]>();
  for (const def of PERMISSIONS as readonly PermissionDef[]) {
    for (const depKey of def.implies ?? []) {
      const list = index.get(depKey) ?? [];
      list.push(def);
      index.set(depKey, list);
    }
  }
  return index;
}

const REVERSE_IMPLIES = buildReverseImpliesIndex();

export interface UseRoleEditorStateOptions {
  initial: RoleEditorInitial;
}

export function useRoleEditorState({ initial }: UseRoleEditorStateOptions) {
  const form = useForm<RoleEditorInput>({
    resolver: zodResolver(RoleEditorSchema),
    mode: "onBlur",
    defaultValues: {
      name: initial.name,
      priority: initial.priority,
      color: initial.color ?? null,
      permissions: initial.permissions,
    },
  });

  // Reset when the initial bitset changes (e.g. after fetch).
  useEffect(() => {
    form.reset({
      name: initial.name,
      priority: initial.priority,
      color: initial.color ?? null,
      permissions: initial.permissions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.name, initial.priority, initial.color, initial.permissions]);

  const wirePermissions = form.watch("permissions");
  const bits = useMemo(
    () => fromBase64(wirePermissions ?? ""),
    [wirePermissions],
  );
  const initialBits = useMemo(
    () => fromBase64(initial.permissions ?? ""),
    [initial.permissions],
  );

  /** Apply a fresh bitset: re-encode and mark RHF dirty. */
  const applyBits = useCallback(
    (nextBits: Uint8Array) => {
      const nextWire = toBase64(nextBits);
      form.setValue("permissions", nextWire, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const [cascade, setCascade] = useState<CascadeDialog>({ kind: "none" });
  const closeCascade = useCallback(() => setCascade({ kind: "none" }), []);

  /**
   * Request a toggle for a single permission. Handles cascades and dangerous
   * dialogs. Callers pass the `PermissionDef`; we do the rest.
   */
  const requestToggle = useCallback(
    (def: PermissionDef, next: boolean) => {
      // Toggling ON a dangerous permission requires a confirm dialog.
      if (next && def.dangerous) {
        setCascade({
          kind: "dangerous",
          def,
          onConfirm: () => {
            applyBits(applyToggleWithImplies(bits, def, true));
            setCascade({ kind: "none" });
          },
        });
        return;
      }

      // Toggling OFF a permission that others imply requires a cascade
      // confirm: those dependents will also lose their bits.
      if (!next) {
        const dependents = (REVERSE_IMPLIES.get(def.key) ?? []).filter((d) =>
          hasBit(bits, d.bit),
        );
        if (dependents.length > 0) {
          setCascade({
            kind: "disabling-implied",
            def,
            dependents,
            onConfirm: () => {
              let out = writeBit(bits, def.bit, false);
              for (const dep of dependents) out = writeBit(out, dep.bit, false);
              applyBits(out);
              setCascade({ kind: "none" });
            },
          });
          return;
        }
      }

      applyBits(applyToggleWithImplies(bits, def, next));
    },
    [applyBits, bits],
  );

  /** Bulk helpers. */
  const grantAllInSubmodule = useCallback(
    (module: ModuleId, submodule: string) => {
      const targets = (PERMISSIONS_BY_MODULE[module] ?? []).filter(
        (p) => p.submodule === submodule && p.bit !== ADMINISTRATOR_BIT,
      );
      let out = bits;
      for (const p of targets) out = writeBit(out, p.bit, true);
      applyBits(out);
    },
    [applyBits, bits],
  );
  const revokeAllInSubmodule = useCallback(
    (module: ModuleId, submodule: string) => {
      const targets = (PERMISSIONS_BY_MODULE[module] ?? []).filter(
        (p) => p.submodule === submodule,
      );
      let out = bits;
      for (const p of targets) out = writeBit(out, p.bit, false);
      applyBits(out);
    },
    [applyBits, bits],
  );

  const grantAllInModule = useCallback(
    (module: ModuleId) => {
      const targets = (PERMISSIONS_BY_MODULE[module] ?? []).filter(
        (p) => p.bit !== ADMINISTRATOR_BIT,
      );
      let out = bits;
      for (const p of targets) out = writeBit(out, p.bit, true);
      applyBits(out);
    },
    [applyBits, bits],
  );
  const revokeAllInModule = useCallback(
    (module: ModuleId) => {
      const targets = PERMISSIONS_BY_MODULE[module] ?? [];
      let out = bits;
      for (const p of targets) out = writeBit(out, p.bit, false);
      applyBits(out);
    },
    [applyBits, bits],
  );

  const setAdministrator = useCallback(
    (next: boolean) => {
      applyBits(writeBit(bits, ADMINISTRATOR_BIT, next));
    },
    [applyBits, bits],
  );

  /** Dirty-bit count: how many bits differ from the initial bitset. */
  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const p of PERMISSIONS) {
      if (hasBit(bits, p.bit) !== hasBit(initialBits, p.bit)) count++;
    }
    return count;
  }, [bits, initialBits]);

  const isBitsetDirty = useMemo(
    () => !equals(bits, initialBits),
    [bits, initialBits],
  );

  /** Granted counts per module (used by the nav rail). */
  const grantedByModule = useMemo(() => {
    const out = {} as Record<ModuleId, number>;
    for (const mod of [
      "INVENTORY",
      "SALES",
      "CRM",
      "WEBSITE",
      "REPORTS",
      "SETTINGS",
    ] as ModuleId[]) {
      const bitsInModule = (PERMISSIONS_BY_MODULE[mod] ?? [])
        .filter((p) => p.bit !== ADMINISTRATOR_BIT)
        .map((p) => p.bit);
      out[mod] = popcountBits(bits, bitsInModule);
    }
    return out;
  }, [bits]);

  const isAdministrator = useMemo(
    () => hasBit(bits, ADMINISTRATOR_BIT),
    [bits],
  );

  return {
    form,
    bits,
    dirtyCount,
    isBitsetDirty,
    grantedByModule,
    isAdministrator,
    // mutators
    requestToggle,
    grantAllInSubmodule,
    revokeAllInSubmodule,
    grantAllInModule,
    revokeAllInModule,
    setAdministrator,
    // cascade dialog
    cascade,
    closeCascade,
  };
}

/**
 * Apply a toggle and, when enabling, also enable all transitively implied
 * permissions until fixpoint. Returns the NEW buffer; input is not mutated.
 */
function applyToggleWithImplies(
  bits: Uint8Array,
  def: PermissionDef,
  next: boolean,
): Uint8Array {
  if (!next) return writeBit(bits, def.bit, false);

  let out = writeBit(bits, def.bit, true);
  const queue = [...(def.implies ?? [])];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const key = queue.shift()!;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = PERMISSION_BY_KEY.get(key);
    if (!d) continue;
    if (!hasBit(out, d.bit)) {
      out = writeBit(out, d.bit, true);
    }
    for (const nested of d.implies ?? []) queue.push(nested);
  }
  return out;
}
