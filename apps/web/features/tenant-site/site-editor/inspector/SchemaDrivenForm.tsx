"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import { z } from "zod";
import { BLOCK_PROPS_SCHEMAS } from "@repo/shared";
import { getFieldOverride } from "./inspector-overrides";
import { getCustomWidget } from "./widgets/registry";
import { MediaPicker } from "./MediaPicker";
import { LinkPicker } from "./LinkPicker";

interface SchemaDrivenFormProps {
  blockKind: string;
  value: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}

type ZodType = z.ZodType<unknown>;

interface FieldInfo {
  name: string;
  schema: ZodType;
  isOptional: boolean;
  override: ReturnType<typeof getFieldOverride>;
}

function detectFieldKind(
  fieldName: string,
  override?: ReturnType<typeof getFieldOverride>,
): "media" | "url" | "text" {
  // Explicit override takes precedence
  if (override?.kind) {
    return override.kind;
  }

  // Media field detection by name
  const mediaPatterns = [
    "src",
    "imageUrl",
    "mediaUrl",
    "bgImage",
    "posterUrl",
    "image",
  ];
  if (mediaPatterns.some((p) => fieldName.toLowerCase().includes(p))) {
    return "media";
  }

  // URL field detection by name
  const urlPatterns = ["href", "url", "link", "ctaUrl", "linkUrl"];
  if (urlPatterns.some((p) => fieldName.toLowerCase().includes(p))) {
    return "url";
  }

  return "text";
}

function extractFieldsFromSchema(schema: ZodType): FieldInfo[] {
  const fields: FieldInfo[] = [];

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, ZodType>;

    Object.entries(shape).forEach(([name, fieldSchema]) => {
      let actualSchema = fieldSchema;
      let isOptional = false;

      if (actualSchema instanceof z.ZodOptional) {
        isOptional = true;
        actualSchema = actualSchema.unwrap();
      }

      fields.push({
        name,
        schema: actualSchema,
        isOptional,
        override: getFieldOverride(schema._def.typeName || "", name),
      });
    });
  }

  return fields;
}

function getMaxLength(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checks: any[],
): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxCheck = checks.find((c: any) => c.kind === "max");
  return maxCheck ? maxCheck.value : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnumValues(def: any): string[] {
  return def.values;
}

function getFieldLabel(
  fieldName: string,
  override?: ReturnType<typeof getFieldOverride>,
): string {
  if (override?.label) return override.label;
  return fieldName
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function renderStringField(
  fieldName: string,
  value: unknown,
  schema: z.ZodString,
  override: ReturnType<typeof getFieldOverride> | undefined,
  onChange: (val: unknown) => void,
): React.ReactNode {
  const fieldKind = detectFieldKind(fieldName, override);

  // Media picker for image fields
  if (fieldKind === "media") {
    return <MediaPicker value={String(value || "")} onChange={onChange} />;
  }

  // Link picker for URL fields
  if (fieldKind === "url") {
    return <LinkPicker value={String(value || "")} onChange={onChange} />;
  }

  // Plain text field
  const maxLength = getMaxLength(schema._def.checks || []);
  const isLongForm = !maxLength || maxLength > 200;
  const stringValue = String(value || "");

  if (isLongForm && !maxLength) {
    return (
      <textarea
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
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
    );
  }

  return (
    <input
      type="text"
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className="w-full h-7 px-2 rounded text-xs"
      style={{
        border: "1px solid var(--line)",
        backgroundColor: "var(--bg-elev)",
        color: "var(--ink)",
        outline: "none",
      }}
    />
  );
}

function renderEnumField(
  fieldName: string,
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodEnum<any>,
  override: ReturnType<typeof getFieldOverride> | undefined,
  onChange: (val: unknown) => void,
): React.ReactNode {
  const options = getEnumValues(schema._def);

  return (
    <select
      value={String(value || "")}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 px-2 rounded text-xs"
      style={{
        border: "1px solid var(--line)",
        backgroundColor: "var(--bg-elev)",
        color: "var(--ink)",
      }}
    >
      <option value="">— Select —</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt
            .split(/(?=[A-Z])|-/)
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ")}
        </option>
      ))}
    </select>
  );
}

function renderNumberField(
  fieldName: string,
  value: unknown,
  schema: z.ZodNumber,
  override: ReturnType<typeof getFieldOverride> | undefined,
  onChange: (val: unknown) => void,
): React.ReactNode {
  const numValue = value === "" || value === null ? "" : Number(value || 0);

  return (
    <input
      type="number"
      value={numValue}
      onChange={(e) =>
        onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
      className="w-full h-7 px-2 rounded text-xs"
      style={{
        border: "1px solid var(--line)",
        backgroundColor: "var(--bg-elev)",
        color: "var(--ink)",
        outline: "none",
      }}
    />
  );
}

function renderBooleanField(
  fieldName: string,
  value: unknown,
  schema: z.ZodBoolean,
  override: ReturnType<typeof getFieldOverride> | undefined,
  onChange: (val: unknown) => void,
): React.ReactNode {
  const boolValue = Boolean(value);

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={boolValue}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded"
        style={{
          cursor: "pointer",
        }}
      />
      <span className="text-xs" style={{ color: "var(--ink)" }}>
        {override?.label || "Enabled"}
      </span>
    </label>
  );
}

function renderArrayField(
  fieldName: string,
  _value: unknown,
  _schema: z.ZodArray<ZodType>,
  override: ReturnType<typeof getFieldOverride> | undefined,
  _onChange: (val: unknown) => void,
): React.ReactNode {
  // Arrays with custom widgets (handled by inspector-overrides)
  // Default: show as text for now (user must use custom widget)
  return (
    <div className="text-xs" style={{ color: "var(--ink-3)" }}>
      {override?.widget
        ? `Array field (custom widget: ${override.widget})`
        : `Array field — use inspector-overrides to define custom widget`}
    </div>
  );
}

function renderUnsupported(
  fieldName: string,
  value: unknown,
  schema: ZodType,
): React.ReactNode {
  return (
    <div className="text-xs" style={{ color: "var(--ink-4)" }}>
      {schema.constructor.name} not yet supported
    </div>
  );
}

export function SchemaDrivenForm({
  blockKind,
  value,
  onChange,
}: SchemaDrivenFormProps) {
  const schema =
    BLOCK_PROPS_SCHEMAS[blockKind as keyof typeof BLOCK_PROPS_SCHEMAS];

  const fields = useMemo(() => {
    if (!schema) return [];
    return extractFieldsFromSchema(schema);
  }, [schema]);

  // Debounced callback: store pending changes and debounce the onChange call
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangesRef = useRef<Record<string, unknown>>({});

  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      // Accumulate changes
      pendingChangesRef.current[fieldName] = fieldValue;
      const newProps = { ...value, ...pendingChangesRef.current };

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new debounced call
      timeoutRef.current = setTimeout(() => {
        onChange(newProps);
        pendingChangesRef.current = {};
      }, 150);
    },
    [value, onChange],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!schema) {
    return (
      <div className="text-xs" style={{ color: "var(--ink-3)" }}>
        No schema found for {blockKind}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {fields.length === 0 ? (
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>
          No editable properties for this block.
        </div>
      ) : (
        fields.map((field) => {
          const fieldLabel = getFieldLabel(field.name, field.override);
          const fieldValue = value[field.name];
          const override = field.override;

          // Bespoke widget — resolve via the registry and mount the
          // real component. Falls back to a "missing" message when the
          // registry doesn't know the widget name (catches typos in
          // inspector-overrides without crashing).
          if (override?.widget) {
            const Widget = getCustomWidget(override.widget);
            if (Widget) {
              return (
                <div key={field.name}>
                  <Widget
                    value={fieldValue}
                    onChange={(next: unknown) =>
                      handleFieldChange(field.name, next)
                    }
                    label={fieldLabel}
                    blockKind={blockKind}
                  />
                </div>
              );
            }
            return (
              <div key={field.name}>
                <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                  {fieldLabel}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-4)" }}>
                  Custom editor missing: {override.widget}
                </div>
              </div>
            );
          }

          let fieldNode: React.ReactNode = renderUnsupported(
            field.name,
            fieldValue,
            field.schema,
          );

          if (field.schema instanceof z.ZodString) {
            fieldNode = renderStringField(
              field.name,
              fieldValue,
              field.schema,
              override,
              (val) => handleFieldChange(field.name, val),
            );
          } else if (field.schema instanceof z.ZodEnum) {
            fieldNode = renderEnumField(
              field.name,
              fieldValue,
              field.schema,
              override,
              (val) => handleFieldChange(field.name, val),
            );
          } else if (field.schema instanceof z.ZodNumber) {
            fieldNode = renderNumberField(
              field.name,
              fieldValue,
              field.schema,
              override,
              (val) => handleFieldChange(field.name, val),
            );
          } else if (field.schema instanceof z.ZodBoolean) {
            fieldNode = renderBooleanField(
              field.name,
              fieldValue,
              field.schema,
              override,
              (val) => handleFieldChange(field.name, val),
            );
          } else if (field.schema instanceof z.ZodArray) {
            fieldNode = renderArrayField(
              field.name,
              fieldValue,
              field.schema,
              override,
              (val) => handleFieldChange(field.name, val),
            );
          } else if (field.schema instanceof z.ZodUnion) {
            // For unions, try to infer the primary type
            const unionOptions = field.schema._def.options as ZodType[];
            if (
              unionOptions.length > 0 &&
              unionOptions[0] instanceof z.ZodString
            ) {
              fieldNode = renderStringField(
                field.name,
                fieldValue,
                unionOptions[0] as z.ZodString,
                override,
                (val) => handleFieldChange(field.name, val),
              );
            } else {
              fieldNode = renderUnsupported(
                field.name,
                fieldValue,
                field.schema,
              );
            }
          }

          return (
            <div key={field.name}>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                {fieldLabel}
                {field.isOptional && (
                  <span style={{ color: "var(--ink-4)" }}> — optional</span>
                )}
              </div>
              {fieldNode}
              {override?.helpText && (
                <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                  {override.helpText}
                </div>
              )}
              {override?.tooltip && (
                <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
                  💡 {override.tooltip}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
