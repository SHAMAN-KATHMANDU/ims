"use client";

/**
 * FormPreviewPanel — live preview of the form block as the tenant
 * configures it. Renders the same `FormFields` component the public
 * site uses (from @repo/blocks) so what the editor shows matches the
 * published render exactly.
 *
 * Read-only by design: the preview disables actual submission. Local
 * useState lets the user click around and try the controls without
 * sending anything to the API.
 *
 * Wrapped in a small "PREVIEW" chip so the user knows this is the
 * canvas-side rendering, not the editor's input form.
 */

import { useMemo, useState } from "react";
import type { FormFieldDef } from "@repo/shared";
import { FormFields } from "@repo/blocks";

interface FormPreviewPanelProps {
  fields: FormFieldDef[];
  submitLabel?: string;
}

export function FormPreviewPanel({
  fields,
  submitLabel,
}: FormPreviewPanelProps) {
  const initialValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of fields) out[f.label] = f.defaultValue ?? "";
    return out;
  }, [fields]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  // Re-seed values when the field schema changes — labels are the keys
  // so a label rename would otherwise leave orphan entries around.
  const fieldSignature = fields.map((f) => f.label).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setValues(initialValues);
  }, [fieldSignature]);

  if (fields.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          border: "1px dashed var(--line)",
          borderRadius: 8,
          background: "var(--bg-elev)",
          color: "var(--ink-4)",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        No questions yet — add a field below to see the preview.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        padding: 16,
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--ink-4)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        PREVIEW
      </div>
      <div style={{ pointerEvents: "auto" }}>
        <FormFields
          fields={fields}
          values={values}
          onChange={(label, value) =>
            setValues((v) => ({ ...v, [label]: value }))
          }
          idPrefix="form-preview"
        />
      </div>
      <button
        type="button"
        disabled
        style={{
          marginTop: 16,
          padding: "0.6rem 1.2rem",
          background: "var(--accent, #4a90e2)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius, 6px)",
          fontSize: 14,
          opacity: 0.7,
          cursor: "not-allowed",
        }}
      >
        {submitLabel ?? "Submit"}
      </button>
    </div>
  );
}
