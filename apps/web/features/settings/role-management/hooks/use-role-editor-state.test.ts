import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PERMISSION_BY_KEY, ADMINISTRATOR_BIT } from "@repo/shared";
import { fromBase64, hasBit, toBase64, empty } from "@/features/permissions";
import { useRoleEditorState } from "./use-role-editor-state";

const EMPTY_WIRE = toBase64(empty());

function setupEmpty() {
  return renderHook(() =>
    useRoleEditorState({
      initial: {
        name: "Test",
        priority: 100,
        color: null,
        permissions: EMPTY_WIRE,
      },
    }),
  );
}

describe("useRoleEditorState", () => {
  it("starts clean (dirty count 0)", () => {
    const { result } = setupEmpty();
    expect(result.current.dirtyCount).toBe(0);
    expect(result.current.isBitsetDirty).toBe(false);
    expect(result.current.isAdministrator).toBe(false);
  });

  it("toggles a simple permission ON without cascades", () => {
    const { result } = setupEmpty();
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;

    act(() => {
      result.current.requestToggle(def, true);
    });

    expect(result.current.cascade.kind).toBe("none");
    expect(hasBit(result.current.bits, def.bit)).toBe(true);
    expect(result.current.dirtyCount).toBe(1);
  });

  it("auto-enables implied permissions when toggling ON (transitive)", () => {
    const { result } = setupEmpty();
    // CREATE implies VIEW
    const create = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    const view = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;

    act(() => {
      result.current.requestToggle(create, true);
    });

    expect(hasBit(result.current.bits, create.bit)).toBe(true);
    expect(hasBit(result.current.bits, view.bit)).toBe(true);
    expect(result.current.dirtyCount).toBe(2);
  });

  it("opens a dangerous confirm dialog when toggling a dangerous perm ON", () => {
    const { result } = setupEmpty();
    const del = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.DELETE")!;

    act(() => {
      result.current.requestToggle(del, true);
    });

    expect(result.current.cascade.kind).toBe("dangerous");

    // Confirming applies the change
    act(() => {
      if (result.current.cascade.kind === "dangerous") {
        result.current.cascade.onConfirm();
      }
    });
    expect(result.current.cascade.kind).toBe("none");
    expect(hasBit(result.current.bits, del.bit)).toBe(true);
  });

  it("opens a cascade dialog when disabling an implied-by permission", () => {
    const { result } = setupEmpty();
    const create = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    const view = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;

    // Enable CREATE (also enables VIEW via implies)
    act(() => {
      result.current.requestToggle(create, true);
    });
    expect(hasBit(result.current.bits, view.bit)).toBe(true);

    // Now disable VIEW — should trigger cascade dialog
    act(() => {
      result.current.requestToggle(view, false);
    });

    expect(result.current.cascade.kind).toBe("disabling-implied");

    // Confirm cascade disables both
    act(() => {
      if (result.current.cascade.kind === "disabling-implied") {
        result.current.cascade.onConfirm();
      }
    });
    expect(hasBit(result.current.bits, view.bit)).toBe(false);
    expect(hasBit(result.current.bits, create.bit)).toBe(false);
  });

  it("grantAllInModule flips every bit in the module ON (except admin)", () => {
    const { result } = setupEmpty();
    act(() => {
      result.current.grantAllInModule("SALES");
    });
    expect(result.current.grantedByModule.SALES).toBeGreaterThan(0);
    expect(hasBit(result.current.bits, ADMINISTRATOR_BIT)).toBe(false);
  });

  it("setAdministrator toggles the administrator bit", () => {
    const { result } = setupEmpty();
    act(() => {
      result.current.setAdministrator(true);
    });
    expect(result.current.isAdministrator).toBe(true);
    expect(hasBit(result.current.bits, ADMINISTRATOR_BIT)).toBe(true);
  });

  it("popcounts dirty bits against the initial bitset", () => {
    const view = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    // Start with VIEW already set.
    const pre = empty();
    const idx = view.bit >> 3;
    pre[idx] = (pre[idx] ?? 0) | (1 << (view.bit & 7));
    const { result } = renderHook(() =>
      useRoleEditorState({
        initial: {
          name: "T",
          priority: 0,
          color: null,
          permissions: toBase64(pre),
        },
      }),
    );

    // Disabling the starting bit produces dirtyCount=1.
    act(() => {
      result.current.requestToggle(view, false);
    });
    // May or may not trigger cascade depending on other bits; in the all-else-zero
    // starting state there are no dependents set, so no cascade.
    expect(result.current.cascade.kind).toBe("none");
    expect(hasBit(result.current.bits, view.bit)).toBe(false);
    expect(result.current.dirtyCount).toBe(1);
  });

  it("round-trips the bitset through base64", () => {
    const { result } = setupEmpty();
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    act(() => {
      result.current.requestToggle(def, true);
    });
    const wire = result.current.form.getValues("permissions");
    const decoded = fromBase64(wire);
    expect(hasBit(decoded, def.bit)).toBe(true);
  });
});
