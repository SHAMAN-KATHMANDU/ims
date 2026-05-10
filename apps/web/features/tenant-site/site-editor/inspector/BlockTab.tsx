"use client";

import { useState } from "react";
import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { selectUpdateBlockProps } from "../store/selectors";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import { VariantPicker } from "./widgets/VariantPicker";
import { ProductPickerDialog } from "../../components/ProductPickerDialog";
import { useCategories } from "@/features/products";

interface BlockTabProps {
  block: BlockNode | undefined;
}

export function BlockTab({ block }: BlockTabProps) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);

  if (!block) {
    return (
      <div
        className="p-3.5 text-xs text-center"
        style={{ color: "var(--ink-4)" }}
      >
        Select a block to edit its properties.
      </div>
    );
  }

  const blockType = block.kind.charAt(0).toUpperCase() + block.kind.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = block.props as any;

  const renderBlockProperties = () => {
    switch (block.kind) {
      case "heading": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heading = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Text
              </div>
              <input
                type="text"
                value={heading.text || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { text: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Level
              </div>
              <select
                value={String(heading.level || 2)}
                onChange={(e) =>
                  updateBlockProps(block.id, {
                    level: parseInt(e.target.value) as 1 | 2 | 3,
                  })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              >
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
            </div>
          </>
        );
      }
      case "rich-text": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const richText = props as any;
        // The rich-text schema's strict() object accepts `source` (markdown),
        // not `text`. Reading/writing `text` here used to break autosave with
        // the "Unrecognized key(s) in object: 'text'" toast.
        return (
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Text content
            </div>
            <textarea
              value={richText.source || ""}
              onChange={(e) =>
                updateBlockProps(block.id, { source: e.target.value })
              }
              rows={3}
              className="w-full p-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
        );
      }
      case "button": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const button = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Label
              </div>
              <input
                type="text"
                value={button.label || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { label: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                URL
              </div>
              <input
                type="text"
                value={button.href || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { href: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Style
              </div>
              <select
                value={button.style || "primary"}
                onChange={(e) =>
                  updateBlockProps(block.id, {
                    style: e.target.value as "primary" | "outline" | "ghost",
                  })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              >
                <option value="primary">Primary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </select>
            </div>
          </>
        );
      }
      case "image": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const image = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Image URL
              </div>
              <input
                type="text"
                value={image.src || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { src: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Alt text
              </div>
              <input
                type="text"
                value={image.alt || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { alt: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
          </>
        );
      }
      case "form": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = props as any;
        return (
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Form ID (optional)
            </div>
            <input
              type="text"
              placeholder="Leave empty for inline fields"
              value={form.formId || ""}
              onChange={(e) =>
                updateBlockProps(block.id, { formId: e.target.value })
              }
              className="w-full h-7 px-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
              Reference a stored form, or define fields inline in the editor.
            </div>
          </div>
        );
      }
      case "product-grid": {
        return <ProductGridInspector block={block} />;
      }
      case "nav-bar": {
        return <NavBarInspector block={block} />;
      }
      default:
        return (
          <SchemaDrivenForm
            blockKind={block.kind}
            value={props}
            onChange={(newProps) => updateBlockProps(block.id, newProps)}
          />
        );
    }
  };

  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Block type heading */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider"
          style={{ color: "var(--ink-4)" }}
        >
          {blockType} block
        </div>
      </div>

      {/* Variant picker — auto-shown when the block schema declares a
          `variant` enum. Renders nothing for blocks without variants. */}
      <VariantPicker
        blockKind={block.kind}
        value={(props as { variant?: string }).variant}
        onChange={(variant) =>
          // VariantPicker only emits values it read off the schema's
          // own enum, so the cast is safe — TypeScript can't narrow
          // because updateBlockProps is generic over BlockKind.
          updateBlockProps(block.id, {
            variant,
          } as Record<string, unknown>)
        }
      />

      {/* Block-specific properties */}
      {renderBlockProperties()}
    </div>
  );
}

// ─── ProductGrid inspector ────────────────────────────────────────────────────
//
// Surfaces the product-grid schema's `source` / `productIds` / `categoryId` /
// `columns` / `limit` / `showPrice` / `showSku` fields. The schema and the
// renderer's `selectProducts()` already understand `source: "manual"` —
// previously there was no UI to pick the products, so the "Manual" option was
// unreachable and the inspector showed "No editable properties".

interface ProductGridInspectorProps {
  block: BlockNode;
}

function ProductGridInspector({ block }: ProductGridInspectorProps) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = block.props as any;
  const source = (props.source as string | undefined) ?? "all";
  const productIds = (props.productIds as string[] | undefined) ?? [];
  const categoryId = (props.categoryId as string | undefined) ?? "";
  const columns = (props.columns as number | undefined) ?? 3;
  const limit = (props.limit as number | undefined) ?? 12;
  const showPrice = props.showPrice !== false;
  const showSku = props.showSku === true;

  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: categoriesData } = useCategories();
  // useCategories returns either Category[] directly or { categories: Category[] }
  // depending on the API shape; normalize both into a plain array.
  const categories: Array<{ id: string; name: string }> = (() => {
    if (!categoriesData) return [];
    if (Array.isArray(categoriesData)) {
      return categoriesData as Array<{ id: string; name: string }>;
    }
    const wrapped = categoriesData as {
      categories?: Array<{ id: string; name: string }>;
    };
    return wrapped.categories ?? [];
  })();

  const labelStyle = {
    color: "var(--ink-3)",
  } as const;
  const inputStyle = {
    border: "1px solid var(--line)",
    backgroundColor: "var(--bg-elev)",
    color: "var(--ink)",
    outline: "none",
  } as const;

  return (
    <>
      <div>
        <div className="text-xs mb-1" style={labelStyle}>
          Source
        </div>
        <select
          value={source}
          onChange={(e) =>
            updateBlockProps(block.id, { source: e.target.value })
          }
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        >
          <option value="all">All products</option>
          <option value="category">By category</option>
          <option value="manual">Manually picked</option>
          <option value="on-sale">On sale</option>
        </select>
      </div>

      {source === "category" && (
        <div>
          <div className="text-xs mb-1" style={labelStyle}>
            Category
          </div>
          <select
            value={categoryId}
            onChange={(e) =>
              updateBlockProps(block.id, { categoryId: e.target.value })
            }
            className="w-full h-7 px-2 rounded text-xs"
            style={inputStyle}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {source === "manual" && (
        <div>
          <div className="text-xs mb-1" style={labelStyle}>
            Picked products
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="h-7 px-3 rounded text-xs"
              style={{
                ...inputStyle,
                cursor: "pointer",
              }}
            >
              Pick products
            </button>
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>
              {productIds.length} selected
            </span>
          </div>
          <ProductPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            initialProductIds={productIds}
            title="Pick products for this grid"
            onSave={async (ids) => {
              updateBlockProps(block.id, { productIds: ids });
              setPickerOpen(false);
            }}
          />
        </div>
      )}

      <div>
        <div className="text-xs mb-1" style={labelStyle}>
          Columns
        </div>
        <select
          value={String(columns)}
          onChange={(e) =>
            updateBlockProps(block.id, { columns: parseInt(e.target.value) })
          }
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs mb-1" style={labelStyle}>
          Limit
        </div>
        <input
          type="number"
          min={1}
          max={50}
          value={limit}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!Number.isNaN(n)) {
              updateBlockProps(block.id, { limit: n });
            }
          }}
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        />
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showPrice}
          onChange={(e) =>
            updateBlockProps(block.id, { showPrice: e.target.checked })
          }
          style={{ accentColor: "var(--accent)" }}
        />
        Show price
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showSku}
          onChange={(e) =>
            updateBlockProps(block.id, { showSku: e.target.checked })
          }
          style={{ accentColor: "var(--accent)" }}
        />
        Show SKU
      </label>
    </>
  );
}

// ─── NavBar inspector ─────────────────────────────────────────────────────────
//
// The header NavBar has two ways to source its menu items:
//
//   1. Site navigation (default) — read from SiteConfig.navigation.primary.
//      One source of truth; editing the Site → Navigation tab updates every
//      header instance at once. The block stores `items: []` so the
//      `resolveItems()` fallback in NavBarBlock.tsx routes to site nav.
//
//   2. Override — the block defines its own `items[]` for special pages
//      (e.g. a marketing landing with a stripped-down nav). Falls back to
//      SchemaDrivenForm so the user can edit the per-item label/href.
//
// Without this toggle the user had no fast path back to "use site nav" once
// they accidentally edited the items prop, because the array was non-empty.

interface NavBarInspectorProps {
  block: BlockNode;
}

function NavBarInspector({ block }: NavBarInspectorProps) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = block.props as any;
  const items = (props.items as Array<unknown> | undefined) ?? [];
  const useSiteNav = items.length === 0;

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={useSiteNav}
          onChange={(e) => {
            if (e.target.checked) {
              // Switch to site nav — clear the block's local items.
              updateBlockProps(block.id, { items: [] });
            } else {
              // Switch to override — seed with a starter item so the user
              // immediately sees the items editor populated.
              updateBlockProps(block.id, {
                items: [{ label: "Shop", href: "/products" }],
              });
            }
          }}
          style={{ accentColor: "var(--accent)" }}
          className="mt-0.5"
        />
        <span>
          <div style={{ color: "var(--ink)" }}>Use site navigation</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>
            Render menu items from Site → Navigation. Off to override per
            header.
          </div>
        </span>
      </label>
      {useSiteNav ? null : (
        <SchemaDrivenForm
          blockKind={block.kind}
          value={props}
          onChange={(newProps) => updateBlockProps(block.id, newProps)}
        />
      )}
    </div>
  );
}
