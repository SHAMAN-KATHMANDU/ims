"use client";

/**
 * Variant picker — segmented chooser for a block's `variant` enum.
 *
 * Detects whether the active block's Zod schema has a `variant` field
 * (an enum of strings), and renders a horizontal row of buttons —
 * one per variant value. Selecting one writes `props.variant` and
 * leaves the rest of the props untouched.
 *
 * Returns null when:
 *   - The block kind has no schema in BLOCK_PROPS_SCHEMAS, or
 *   - The schema has no `variant` field, or
 *   - The variant field isn't an enum (e.g. a free-text string).
 *
 * The dropdown that SchemaDrivenForm auto-renders for the same enum
 * is suppressed by an inspector-overrides hide entry, so a tenant
 * sees a single, prominent picker instead of two controls fighting
 * over the same field.
 */

import { useMemo } from "react";
import { z } from "zod";
import { BLOCK_PROPS_SCHEMAS } from "@repo/shared";

interface VariantPickerProps {
  blockKind: string;
  value: string | undefined;
  onChange: (variant: string) => void;
}

/**
 * Cross-package Zod introspection. Avoids `instanceof` because the
 * editor lives in apps/web while the schemas come from @repo/shared,
 * and a duplicated zod copy in either tree breaks the prototype chain.
 * Falls back to reading `_def.typeName` which is stable across copies.
 */
function readEnumValues(schema: z.ZodType<unknown>): string[] | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  if (!def || def.typeName !== "ZodObject") return null;
  const shape = typeof def.shape === "function" ? def.shape() : def.shape;
  if (!shape || typeof shape !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let variantField: any = shape.variant;
  if (!variantField) return null;
  // Unwrap ZodOptional
  while (variantField?._def?.typeName === "ZodOptional") {
    variantField = variantField._def.innerType;
  }
  if (variantField?._def?.typeName === "ZodEnum") {
    const values = variantField._def.values;
    if (Array.isArray(values)) return values as string[];
  }
  return null;
}

export function VariantPicker({
  blockKind,
  value,
  onChange,
}: VariantPickerProps) {
  const variants = useMemo(() => {
    const schema =
      BLOCK_PROPS_SCHEMAS[blockKind as keyof typeof BLOCK_PROPS_SCHEMAS];
    if (!schema) return null;
    return readEnumValues(schema);
  }, [blockKind]);

  if (!variants || variants.length < 2) return null;
  const active = value ?? variants[0]!;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs" style={{ color: "var(--ink-3)" }}>
        Variant
      </div>
      <div
        role="radiogroup"
        aria-label="Block variant"
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${Math.min(variants.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {variants.map((v) => {
          const isActive = v === active;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(v)}
              className="text-xs rounded px-2 py-1.5 transition-colors"
              style={{
                border: `1px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
                backgroundColor: isActive ? "var(--accent)" : "var(--bg-elev)",
                color: isActive ? "white" : "var(--ink)",
                textAlign: "center",
                cursor: "pointer",
              }}
              title={v}
            >
              {humanize(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function humanize(value: string): string {
  if (!value) return value;
  return value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
