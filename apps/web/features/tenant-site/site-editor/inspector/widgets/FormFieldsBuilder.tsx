"use client";

/**
 * FormFieldsBuilder — inspector widget for editing the form block's
 * `fields[]` array.
 *
 * Each row is a collapsible card. Expanded view shows ALL the per-field
 * config (kind, label, required, placeholder, helpText, defaultValue,
 * options for select/radio, width, validation min/max/pattern). Collapsed
 * view shows the field kind icon + label so the user can scan a long
 * form without expanding every row.
 *
 * Drag-handle sort + duplicate + delete come from `ArrayBuilder`.
 *
 * The whole-form preview lives separately in `FormPreviewPanel` so it
 * can sit above the field list without being trapped inside this
 * widget's collapsible cards.
 */

import type { FormFieldDef, FormFieldKind } from "@repo/shared";
import { ArrayBuilder } from "./ArrayBuilder";

interface FormFieldsBuilderProps {
  value: FormFieldDef[];
  onChange: (fields: FormFieldDef[]) => void;
  label?: string;
}

const KIND_LABELS: Record<FormFieldKind, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  date: "Date",
  textarea: "Long text",
  select: "Dropdown",
  radio: "Radio buttons",
  checkbox: "Single checkbox",
};

const KIND_ICONS: Record<FormFieldKind, string> = {
  text: "Aa",
  email: "@",
  phone: "☏",
  url: "🔗",
  number: "#",
  date: "📅",
  textarea: "¶",
  select: "▾",
  radio: "◉",
  checkbox: "☑",
};

const HAS_OPTIONS: ReadonlySet<FormFieldKind> = new Set(["select", "radio"]);
const HAS_PATTERN: ReadonlySet<FormFieldKind> = new Set([
  "text",
  "phone",
  "url",
]);
const HAS_LENGTH: ReadonlySet<FormFieldKind> = new Set([
  "text",
  "textarea",
  "phone",
  "url",
  "email",
]);
const HAS_NUMERIC_RANGE: ReadonlySet<FormFieldKind> = new Set([
  "number",
  "date",
]);

export function FormFieldsBuilder({
  value,
  onChange,
  label = "Form fields",
}: FormFieldsBuilderProps) {
  const fields = value ?? [];
  return (
    <div className="space-y-2">
      {label && (
        <label
          className="text-xs font-medium"
          style={{ color: "var(--ink-3)" }}
        >
          {label}
        </label>
      )}
      <ArrayBuilder<FormFieldDef>
        value={fields}
        onChange={onChange}
        renderRow={(field, index) => (
          <FieldEditor
            field={field}
            onChange={(next) => {
              const updated = [...fields];
              updated[index] = next;
              onChange(updated);
            }}
          />
        )}
        renderCollapsedTitle={(field) => <CollapsedFieldRow field={field} />}
        addLabel="Add question"
        defaultItem={() => ({
          kind: "text",
          label: "New question",
        })}
      />
    </div>
  );
}

function CollapsedFieldRow({ field }: { field: FormFieldDef }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 4,
          background: "var(--bg-elev)",
          color: "var(--ink-3)",
          fontSize: 11,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {KIND_ICONS[field.kind] ?? "?"}
      </span>
      <span>
        {field.label || (
          <span style={{ color: "var(--ink-4)", fontStyle: "italic" }}>
            Untitled
          </span>
        )}
      </span>
      <span style={{ color: "var(--ink-4)", fontSize: 12 }}>
        · {KIND_LABELS[field.kind] ?? field.kind}
      </span>
      {field.required && (
        <span
          aria-label="required"
          style={{ color: "var(--color-error, #b91c1c)" }}
        >
          *
        </span>
      )}
    </span>
  );
}

interface FieldEditorProps {
  field: FormFieldDef;
  onChange: (next: FormFieldDef) => void;
}

function FieldEditor({ field, onChange }: FieldEditorProps) {
  const update = <K extends keyof FormFieldDef>(
    key: K,
    val: FormFieldDef[K] | undefined,
  ) => {
    const next: FormFieldDef = { ...field };
    if (val === undefined || val === "" || val === null) {
      delete next[key];
    } else {
      next[key] = val as FormFieldDef[K];
    }
    onChange(next);
  };

  const showOptions = HAS_OPTIONS.has(field.kind);
  const showPattern = HAS_PATTERN.has(field.kind);
  const showLength = HAS_LENGTH.has(field.kind);
  const showNumericRange = HAS_NUMERIC_RANGE.has(field.kind);

  return (
    <div className="flex flex-col gap-3">
      <Row label="Question type">
        <select
          value={field.kind}
          onChange={(e) => update("kind", e.target.value as FormFieldKind)}
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        >
          {Object.entries(KIND_LABELS).map(([k, lbl]) => (
            <option key={k} value={k}>
              {lbl}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Question / label">
        <input
          type="text"
          value={field.label}
          onChange={(e) => update("label", e.target.value)}
          placeholder="What's your name?"
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        />
      </Row>

      {field.kind !== "checkbox" && (
        <Row label="Placeholder">
          <input
            type="text"
            value={field.placeholder ?? ""}
            onChange={(e) => update("placeholder", e.target.value)}
            placeholder="Hint shown inside the input"
            className="w-full h-7 px-2 rounded text-xs"
            style={inputStyle}
          />
        </Row>
      )}

      <Row label="Help text">
        <input
          type="text"
          value={field.helpText ?? ""}
          onChange={(e) => update("helpText", e.target.value)}
          placeholder="Stays visible below the field"
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        />
      </Row>

      <Row label="Default value">
        <input
          type="text"
          value={field.defaultValue ?? ""}
          onChange={(e) => update("defaultValue", e.target.value)}
          placeholder={
            field.kind === "checkbox"
              ? "true to pre-check"
              : "Pre-fills the field"
          }
          className="w-full h-7 px-2 rounded text-xs"
          style={inputStyle}
        />
      </Row>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
        <label
          className="text-xs"
          style={{ color: "var(--ink)", display: "flex", gap: 6 }}
        >
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => update("required", e.target.checked || undefined)}
            style={{ accentColor: "var(--accent)" }}
          />
          Required
        </label>
        {field.kind !== "checkbox" && (
          <Row label="Width" inline>
            <select
              value={field.width ?? "full"}
              onChange={(e) =>
                update("width", e.target.value === "half" ? "half" : "full")
              }
              className="h-7 px-2 rounded text-xs"
              style={inputStyle}
            >
              <option value="full">Full</option>
              <option value="half">Half</option>
            </select>
          </Row>
        )}
      </div>

      {showOptions && (
        <Row
          label={field.kind === "select" ? "Dropdown options" : "Radio choices"}
          help="One per line. Use `Label = Value` to display a different label than the submitted value."
        >
          <textarea
            value={optionsToText(field.options)}
            onChange={(e) =>
              update(
                "options",
                textToOptions(e.target.value) as FormFieldDef["options"],
              )
            }
            rows={4}
            placeholder={"Yes = true\nNo = false"}
            className="w-full px-2 py-1.5 rounded text-xs font-mono"
            style={{ ...inputStyle, height: "auto", minHeight: 80 }}
          />
        </Row>
      )}

      {(showLength || showNumericRange) && (
        <div style={{ display: "flex", gap: 12 }}>
          <Row label={showNumericRange ? "Min" : "Min length"} inline>
            <input
              type="number"
              value={field.min ?? ""}
              onChange={(e) =>
                update(
                  "min",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              className="h-7 px-2 rounded text-xs w-20"
              style={inputStyle}
            />
          </Row>
          <Row label={showNumericRange ? "Max" : "Max length"} inline>
            <input
              type="number"
              value={field.max ?? ""}
              onChange={(e) =>
                update(
                  "max",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              className="h-7 px-2 rounded text-xs w-20"
              style={inputStyle}
            />
          </Row>
        </div>
      )}

      {showPattern && (
        <Row label="Pattern (regex)" help="Advanced — leave empty to skip.">
          <input
            type="text"
            value={field.pattern ?? ""}
            onChange={(e) => update("pattern", e.target.value)}
            placeholder="^[A-Z]{3}-\d+$"
            className="w-full h-7 px-2 rounded text-xs font-mono"
            style={inputStyle}
          />
        </Row>
      )}
    </div>
  );
}

function Row({
  label,
  help,
  children,
  inline = false,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>
          {label}
        </span>
        {children}
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
        {label}
      </div>
      {children}
      {help && (
        <div
          className="text-xs mt-1"
          style={{ color: "var(--ink-4)", lineHeight: 1.4 }}
        >
          {help}
        </div>
      )}
    </div>
  );
}

// `Label = Value\nLabel2 = Value2` ↔ FormFieldOption[]
function optionsToText(options: FormFieldDef["options"]): string {
  if (!options || options.length === 0) return "";
  return options
    .map((opt) =>
      typeof opt === "string"
        ? opt
        : opt.label === opt.value
          ? opt.label
          : `${opt.label} = ${opt.value}`,
    )
    .join("\n");
}

function textToOptions(text: string): FormFieldDef["options"] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (lines.length === 0) return undefined;
  return lines.map((line) => {
    const eq = line.indexOf("=");
    if (eq === -1) return line;
    const label = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!label || !value || label === value) return label || value;
    return { label, value };
  });
}

const inputStyle = {
  border: "1px solid var(--line)",
  backgroundColor: "var(--bg-elev)",
  color: "var(--ink)",
  outline: "none",
} as const;
