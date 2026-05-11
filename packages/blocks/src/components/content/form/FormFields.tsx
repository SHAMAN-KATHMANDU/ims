"use client";

/**
 * FormFields — renders a list of form field controls from `FormFieldDef[]`.
 *
 * Lives outside FormBlock so the editor's inspector preview pane can
 * render the exact same controls without duplicating the switch logic.
 *
 * Design notes:
 *   - Every field passes through `controlStyle` so an editor / a tenant
 *     can drop the same form into different theme contexts and have it
 *     pick up theme tokens.
 *   - `width: half` puts adjacent half-fields side-by-side via a CSS
 *     grid wrapper at the parent. The control itself doesn't know about
 *     layout — that's a parent concern.
 *   - Multi-option fields (select, radio) accept either bare strings
 *     or `{ label, value }` pairs. `optionLabel`/`optionValue` normalise
 *     so the renderer doesn't branch downstream.
 *   - Single-checkbox fields submit "true"/"" — multi-checkbox would
 *     need an array, which this version doesn't support (use radio +
 *     "Other" or split into multiple checkboxes for now).
 */

import type { FormFieldDef, FormFieldOption } from "@repo/shared";

interface FormFieldsProps {
  fields: FormFieldDef[];
  values: Record<string, string>;
  onChange: (label: string, value: string) => void;
  errors?: Record<string, string>;
  /** When true (editor preview mode), disables the controls. */
  readOnly?: boolean;
  /**
   * Per-field id prefix so multiple instances on the same page (live +
   * preview) don't collide on `id`/`for` matching for screen readers.
   */
  idPrefix?: string;
}

export function FormFields({
  fields,
  values,
  onChange,
  errors = {},
  readOnly = false,
  idPrefix = "form",
}: FormFieldsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "1.25rem",
      }}
    >
      {fields.map((field, idx) => {
        const fieldId = `${idPrefix}-${idx}-${slugifyLabel(field.label)}`;
        const errorId = `${fieldId}-error`;
        const helpId = `${fieldId}-help`;
        const halfSpan = field.width === "half";
        return (
          <div
            key={fieldId}
            style={{
              gridColumn: halfSpan ? "auto" : "1 / -1",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {field.kind !== "checkbox" && (
              <label
                htmlFor={fieldId}
                style={{ fontSize: "0.85rem", fontWeight: 500 }}
              >
                {field.label}
                {field.required && (
                  <span
                    aria-hidden="true"
                    style={{ color: "var(--color-error, #b91c1c)" }}
                  >
                    {" "}
                    *
                  </span>
                )}
              </label>
            )}
            <FieldControl
              field={field}
              fieldId={fieldId}
              value={values[field.label] ?? ""}
              onChange={(v) => onChange(field.label, v)}
              readOnly={readOnly}
              describedBy={
                [
                  errors[field.label] ? errorId : null,
                  field.helpText ? helpId : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            {field.helpText && (
              <span
                id={helpId}
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-muted, #6b7280)",
                  lineHeight: 1.5,
                }}
              >
                {field.helpText}
              </span>
            )}
            {errors[field.label] && (
              <span
                id={errorId}
                role="alert"
                style={{
                  fontSize: "0.78rem",
                  color: "var(--color-error, #b91c1c)",
                }}
              >
                {errors[field.label]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface FieldControlProps {
  field: FormFieldDef;
  fieldId: string;
  value: string;
  onChange: (next: string) => void;
  readOnly: boolean;
  describedBy?: string;
}

function FieldControl({
  field,
  fieldId,
  value,
  onChange,
  readOnly,
  describedBy,
}: FieldControlProps) {
  const common = {
    id: fieldId,
    name: field.label,
    required: field.required,
    "aria-required": field.required ? true : undefined,
    "aria-describedby": describedBy,
    placeholder: field.placeholder,
    disabled: readOnly,
  } as const;

  switch (field.kind) {
    case "textarea":
      return (
        <textarea
          {...common}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          minLength={field.min}
          maxLength={field.max}
          style={inputStyle}
        />
      );
    case "select":
      return (
        <select
          {...common}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">{field.placeholder ?? "Select…"}</option>
          {(field.options ?? []).map((opt) => {
            const o = normaliseOption(opt);
            return (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            );
          })}
        </select>
      );
    case "radio": {
      const groupName = `${fieldId}-radio`;
      return (
        <div
          role="radiogroup"
          aria-labelledby={fieldId}
          aria-describedby={describedBy}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {(field.options ?? []).map((opt, optIdx) => {
            const o = normaliseOption(opt);
            const optId = `${fieldId}-opt-${optIdx}`;
            return (
              <label
                key={optId}
                htmlFor={optId}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  fontSize: "0.95rem",
                }}
              >
                <input
                  id={optId}
                  type="radio"
                  name={groupName}
                  value={o.value}
                  checked={value === o.value}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  disabled={readOnly}
                  style={{ accentColor: "var(--color-primary, #4a90e2)" }}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case "checkbox": {
      const checked = value === "true";
      return (
        <label
          htmlFor={fieldId}
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "flex-start",
            fontSize: "0.95rem",
          }}
        >
          <input
            id={fieldId}
            name={field.label}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            required={field.required}
            disabled={readOnly}
            aria-describedby={describedBy}
            style={{
              marginTop: "0.2rem",
              accentColor: "var(--color-primary, #4a90e2)",
            }}
          />
          <span>
            {field.label}
            {field.required && (
              <span
                aria-hidden="true"
                style={{ color: "var(--color-error, #b91c1c)" }}
              >
                {" "}
                *
              </span>
            )}
          </span>
        </label>
      );
    }
    case "number":
      return (
        <input
          {...common}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={field.min}
          max={field.max}
          style={inputStyle}
        />
      );
    case "date":
      return (
        <input
          {...common}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={field.min !== undefined ? String(field.min) : undefined}
          max={field.max !== undefined ? String(field.max) : undefined}
          style={inputStyle}
        />
      );
    case "url":
      return (
        <input
          {...common}
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern={field.pattern}
          minLength={field.min}
          maxLength={field.max}
          style={inputStyle}
        />
      );
    case "email":
      return (
        <input
          {...common}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={field.min}
          maxLength={field.max}
          style={inputStyle}
        />
      );
    case "phone":
      return (
        <input
          {...common}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern={field.pattern}
          minLength={field.min}
          maxLength={field.max}
          style={inputStyle}
        />
      );
    case "text":
    default:
      return (
        <input
          {...common}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern={field.pattern}
          minLength={field.min}
          maxLength={field.max}
          style={inputStyle}
        />
      );
  }
}

function normaliseOption(opt: FormFieldOption): {
  label: string;
  value: string;
} {
  if (typeof opt === "string") return { label: opt, value: opt };
  return { label: opt.label, value: opt.value };
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const inputStyle: React.CSSProperties = {
  padding: "0.85rem 1.1rem",
  minHeight: 44,
  border: "1px solid var(--color-border, #d1d5db)",
  borderRadius: "var(--radius, 6px)",
  background: "var(--color-background, #fff)",
  color: "var(--color-text, #1f2937)",
  fontSize: "1rem",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};
