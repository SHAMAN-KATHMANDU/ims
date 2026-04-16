"use client";

/**
 * BlockInspector — right pane of the editor.
 *
 * Renders an editable form for the selected block's props. The form is
 * derived from the Zod schema in @repo/shared's BlockPropsSchemas, so adding
 * a new block kind automatically gets an inspector UI as long as the schema
 * stays within our supported primitives.
 *
 * Supported field types:
 *   - z.string() -> <Input>
 *   - z.string() with long max -> <Textarea>
 *   - z.number() -> <Input type="number">
 *   - z.boolean() -> <Switch>
 *   - z.enum() / z.literal union -> <Select>
 *   - z.array(z.object()) -> repeater with per-row fields
 *   - z.array(z.string()) -> comma-separated list in <Input>
 *
 * Anything the mapper can't introspect falls back to a raw JSON editor.
 * This is the Phase 4 floor — we extend it as new block shapes land.
 */

import { useMemo, useState } from "react";
import { z } from "zod";
import { BlockPropsSchemas } from "@repo/shared";
import type { BlockNode } from "@repo/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  useEditorStore,
  selectSelectedBlock,
  selectSelectedId,
} from "./editor-store";
import { getCatalogEntry } from "./block-catalog";
import { ProductPickerField } from "./ProductPickerField";
import { CategoryPickerField } from "./CategoryPickerField";

export function BlockInspector() {
  const selected = useEditorStore(selectSelectedBlock);
  const selectedId = useEditorStore(selectSelectedId);

  if (!selected || !selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a block to edit its properties.
      </div>
    );
  }

  const entry = getCatalogEntry(selected.kind);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">
          {entry?.label ?? selected.kind}
        </div>
        <div className="text-xs text-muted-foreground">
          {entry?.description}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        <VisibilitySection block={selected} />
        <StyleOverrideSection block={selected} />
        <BlockForm block={selected} />
        <AdvancedSection block={selected} />
      </div>
    </div>
  );
}

function VisibilitySection({ block }: { block: BlockNode }) {
  const updateBlockVisibility = useEditorStore((s) => s.updateBlockVisibility);
  const vis = block.visibility ?? {};
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Device visibility
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: "desktop", label: "Desktop" },
            { key: "tablet", label: "Tablet" },
            { key: "mobile", label: "Mobile" },
          ] as const
        ).map(({ key, label }) => {
          const visible = vis[key] !== false;
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-md border border-border p-2"
            >
              <Switch
                checked={visible}
                onCheckedChange={(v) =>
                  updateBlockVisibility(block.id, {
                    [key]: v ? undefined : false,
                  })
                }
                aria-label={`Show on ${label}`}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
      {(vis.mobile === false ||
        vis.tablet === false ||
        vis.desktop === false) && (
        <p className="text-[10px] text-amber-600">
          Hidden on{" "}
          {[
            vis.desktop === false && "desktop",
            vis.tablet === false && "tablet",
            vis.mobile === false && "mobile",
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

const THEME_TOKEN_OPTIONS = [
  { value: "", label: "Default" },
  { value: "color-primary", label: "Primary" },
  { value: "color-secondary", label: "Secondary" },
  { value: "color-accent", label: "Accent" },
  { value: "color-background", label: "Background" },
  { value: "color-surface", label: "Surface" },
  { value: "color-text", label: "Text" },
  { value: "color-muted", label: "Muted" },
];

function StyleOverrideSection({ block }: { block: BlockNode }) {
  const updateBlockStyle = useEditorStore((s) => s.updateBlockStyle);
  const style = block.style ?? {};

  return (
    <details className="group" open>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Style
      </summary>
      <div className="mt-2 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Alignment</Label>
          <Select
            value={style.alignment ?? ""}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                alignment: (v || undefined) as typeof style.alignment,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="start">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Padding Y</Label>
          <Select
            value={style.paddingY ?? ""}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                paddingY: (v || undefined) as typeof style.paddingY,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Max Width</Label>
          <Select
            value={style.maxWidth ?? ""}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                maxWidth: (v || undefined) as typeof style.maxWidth,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="narrow">Narrow (640px)</SelectItem>
              <SelectItem value="default">Default (1200px)</SelectItem>
              <SelectItem value="wide">Wide (1440px)</SelectItem>
              <SelectItem value="full">Full width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Background</Label>
          <Select
            value={style.backgroundToken ?? ""}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                backgroundToken: v || undefined,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {THEME_TOKEN_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Text Color</Label>
          <Select
            value={style.textToken ?? ""}
            onValueChange={(v) =>
              updateBlockStyle(block.id, {
                textToken: v || undefined,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {THEME_TOKEN_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </details>
  );
}

function AdvancedSection({ block }: { block: BlockNode }) {
  const updateBlockId = useEditorStore((s) => s.updateBlockId);
  const [editingId, setEditingId] = useState(block.id);

  // Sync when selection changes
  if (editingId !== block.id && !editingId.startsWith("__editing__")) {
    // block.id changed externally (e.g. undo) — reset
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Advanced
      </summary>
      <div className="mt-2 space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">
            Block ID{" "}
            <span className="font-normal text-muted-foreground">
              (for anchor links: #{block.id})
            </span>
          </Label>
          <Input
            value={editingId}
            onChange={(e) => setEditingId(e.target.value)}
            onBlur={() => {
              if (editingId.trim() && editingId !== block.id) {
                updateBlockId(block.id, editingId.trim());
              }
            }}
            className="h-8 font-mono text-xs"
            placeholder="unique-section-id"
          />
          <p className="text-[10px] text-muted-foreground">
            Use this ID for anchor links: add a button with href{" "}
            <code>#{block.id}</code> to scroll here.
          </p>
        </div>
      </div>
    </details>
  );
}

function BlockForm({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const schema = (BlockPropsSchemas as Record<string, z.ZodType<unknown>>)[
    block.kind
  ];
  // Introspect unconditionally — keeps the Hook order stable across the
  // early-return branch below.
  const fields = useMemo(
    () => (schema ? introspectSchema(schema) : []),
    [schema],
  );
  if (!schema) {
    return <JsonFallback block={block} />;
  }

  const value = block.props as Record<string, unknown>;

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(v) =>
            updateBlockProps(block.id, { [field.name]: v } as never)
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema introspection
// ---------------------------------------------------------------------------

type FieldKind =
  | "string"
  | "textarea"
  | "number"
  | "boolean"
  | "enum"
  | "array-of-objects"
  | "array-of-strings"
  | "raw";

interface FieldDescriptor {
  name: string;
  kind: FieldKind;
  optional: boolean;
  /** For enum fields. */
  options?: string[];
  /** For array-of-objects: sub-field descriptors. */
  itemFields?: FieldDescriptor[];
  /** For array-of-objects: fresh-item factory. */
  createItem?: () => Record<string, unknown>;
}

function unwrap(schema: z.ZodType<unknown>): {
  inner: z.ZodType<unknown>;
  optional: boolean;
} {
  let inner: z.ZodType<unknown> = schema;
  let optional = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((inner as any)._def) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (inner as any)._def;
    if (def.typeName === "ZodOptional" || def.typeName === "ZodNullable") {
      optional = true;
      inner = def.innerType;
      continue;
    }
    if (def.typeName === "ZodDefault") {
      inner = def.innerType;
      continue;
    }
    break;
  }
  return { inner, optional };
}

function describeField(
  name: string,
  schema: z.ZodType<unknown>,
): FieldDescriptor {
  const { inner, optional } = unwrap(schema);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (inner as any)._def;
  const typeName = def?.typeName as string | undefined;

  if (typeName === "ZodString") {
    const checks = (def.checks ?? []) as Array<{
      kind: string;
      value?: number;
    }>;
    const maxCheck = checks.find((c) => c.kind === "max");
    const isLong = (maxCheck?.value ?? 0) > 500;
    return { name, kind: isLong ? "textarea" : "string", optional };
  }
  if (typeName === "ZodNumber") {
    return { name, kind: "number", optional };
  }
  if (typeName === "ZodBoolean") {
    return { name, kind: "boolean", optional };
  }
  if (typeName === "ZodEnum") {
    return {
      name,
      kind: "enum",
      optional,
      options: (def.values as string[]) ?? [],
    };
  }
  if (typeName === "ZodUnion") {
    // Handle z.union([z.literal(2), z.literal(3), ...]) → enum-ish
    const options = def.options as z.ZodType<unknown>[];
    const literals: string[] = [];
    for (const opt of options) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const od = (opt as any)._def;
      if (od?.typeName === "ZodLiteral" && od.value !== undefined) {
        literals.push(String(od.value));
      }
    }
    if (literals.length === options.length && literals.length > 0) {
      return { name, kind: "enum", optional, options: literals };
    }
    return { name, kind: "raw", optional };
  }
  if (typeName === "ZodArray") {
    const element = def.type as z.ZodType<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elDef = (element as any)._def;
    if (elDef?.typeName === "ZodObject") {
      const shape = elDef.shape() as Record<string, z.ZodType<unknown>>;
      const itemFields = Object.entries(shape).map(([k, v]) =>
        describeField(k, v),
      );
      const createItem = () => {
        const out: Record<string, unknown> = {};
        for (const f of itemFields) {
          out[f.name] =
            f.kind === "string" || f.kind === "textarea"
              ? ""
              : f.kind === "number"
                ? 0
                : f.kind === "boolean"
                  ? false
                  : f.kind === "enum" && f.options?.[0]
                    ? f.options[0]
                    : "";
        }
        return out;
      };
      return {
        name,
        kind: "array-of-objects",
        optional,
        itemFields,
        createItem,
      };
    }
    if (elDef?.typeName === "ZodString") {
      return { name, kind: "array-of-strings", optional };
    }
    return { name, kind: "raw", optional };
  }
  return { name, kind: "raw", optional };
}

function introspectSchema(schema: z.ZodType<unknown>): FieldDescriptor[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  if (def?.typeName !== "ZodObject") return [];
  const shape = def.shape() as Record<string, z.ZodType<unknown>>;
  return Object.entries(shape).map(([name, s]) => describeField(name, s));
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const labelText = humanize(field.name);

  if (field.kind === "string") {
    if (field.name === "categoryId") {
      return (
        <CategoryPickerField
          value={(value as string | undefined) ?? ""}
          onChange={(v) => onChange(v || undefined)}
        />
      );
    }
    return (
      <div className="space-y-1">
        <Label>{labelText}</Label>
        <Input
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (
      <div className="space-y-1">
        <Label>{labelText}</Label>
        <Textarea
          rows={5}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.kind === "number") {
    return (
      <div className="space-y-1">
        <Label>{labelText}</Label>
        <Input
          type="number"
          value={(value as number | undefined) ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : Number(v));
          }}
        />
      </div>
    );
  }
  if (field.kind === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <span className="text-sm">{labelText}</span>
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }
  if (field.kind === "enum" && field.options) {
    const current = value === undefined || value === null ? "" : String(value);
    return (
      <div className="space-y-1">
        <Label>{labelText}</Label>
        <Select
          value={current}
          onValueChange={(v) => {
            // Coerce back to number if the original option was numeric.
            const asNum = Number(v);
            onChange(Number.isFinite(asNum) && String(asNum) === v ? asNum : v);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.kind === "array-of-strings") {
    if (field.name === "productIds") {
      return (
        <ProductPickerField
          value={value as string[] | undefined}
          onChange={onChange}
        />
      );
    }
    const arr = (value as string[] | undefined) ?? [];
    return (
      <div className="space-y-1">
        <Label>{labelText}</Label>
        <Input
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="comma-separated"
        />
      </div>
    );
  }
  if (field.kind === "array-of-objects") {
    const arr = (
      (value as Record<string, unknown>[] | undefined) ?? []
    ).slice();
    const addItem = () => {
      onChange([...arr, field.createItem?.() ?? {}]);
    };
    const removeItem = (idx: number) => {
      onChange(arr.filter((_, i) => i !== idx));
    };
    const updateItem = (idx: number, itemPatch: Record<string, unknown>) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...itemPatch };
      onChange(next);
    };
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{labelText}</Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {arr.map((item, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {(field.itemFields ?? []).map((sub) => (
                <FieldRenderer
                  key={sub.name}
                  field={sub}
                  value={item[sub.name]}
                  onChange={(v) => updateItem(idx, { [sub.name]: v })}
                />
              ))}
            </div>
          ))}
          {arr.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              No items yet.
            </div>
          )}
        </div>
      </div>
    );
  }
  // raw fallback
  return (
    <div className="space-y-1">
      <Label>{labelText}</Label>
      <Textarea
        rows={4}
        value={JSON.stringify(value ?? "", null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // keep typing — ignore until valid
          }
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        Raw JSON (unsupported field type)
      </p>
    </div>
  );
}

function JsonFallback({ block }: { block: BlockNode }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  return (
    <div className="space-y-1">
      <Label>Raw props</Label>
      <Textarea
        rows={10}
        defaultValue={JSON.stringify(block.props, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            if (parsed && typeof parsed === "object") {
              updateBlockProps(block.id, parsed as never);
            }
          } catch {
            // ignore
          }
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        No schema found for this block kind. Edit raw JSON.
      </p>
    </div>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
