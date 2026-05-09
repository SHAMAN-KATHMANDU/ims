"use client";

/**
 * form block — dynamic contact / lead-capture form.
 *
 * Renders a form from the schema-defined field list; submits to the
 * same-origin proxy at /api/public/form-submissions. The backend
 * stores the submission and optionally creates a CRM Lead when
 * submitTo === "crm-lead".
 */

import { useState } from "react";
import type { FormBlockProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

export function FormBlock({
  node,
  props,
}: BlockComponentProps<FormBlockProps>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const sectionPad = wrapperHasPadY ? undefined : "var(--section-padding) 0";
  const fields = props.fields ?? [];

  const updateField = (label: string, value: string) => {
    setValues((v) => ({ ...v, [label]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/form-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fields: fields.map((f) => ({
            label: f.label,
            value: values[f.label] ?? "",
          })),
          submitTo: props.submitTo,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { message?: string } | null)?.message ??
            `Submission failed (${res.status})`,
        );
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section aria-live="polite" style={{ padding: sectionPad }}>
        <div
          className="container"
          style={{ maxWidth: 640, textAlign: "center" }}
        >
          <div
            aria-hidden="true"
            style={{
              fontSize: "2rem",
              marginBottom: "1rem",
              color: "var(--color-success)",
            }}
          >
            ✓
          </div>
          <p style={{ fontSize: "1.1rem", color: "var(--color-text)" }}>
            {props.successMessage ?? "Thanks! We received your submission."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: sectionPad }}>
      <div className="container" style={{ maxWidth: 640 }}>
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "0.75rem",
            }}
          >
            {props.heading}
          </h2>
        )}
        {props.description && (
          <p
            style={{
              color: "var(--color-muted)",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            {props.description}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {fields.map((field) => (
            <label
              key={field.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {field.label}
                {field.required && (
                  <span
                    aria-label="required"
                    style={{ color: "var(--color-error)" }}
                  >
                    {" "}
                    *
                  </span>
                )}
              </span>
              {field.kind === "textarea" ? (
                <textarea
                  value={values[field.label] ?? ""}
                  onChange={(e) => updateField(field.label, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={4}
                  style={inputStyle}
                />
              ) : field.kind === "select" ? (
                <select
                  value={values[field.label] ?? ""}
                  onChange={(e) => updateField(field.label, e.target.value)}
                  required={field.required}
                  style={inputStyle}
                >
                  <option value="">{field.placeholder ?? "Select…"}</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    field.kind === "email"
                      ? "email"
                      : field.kind === "phone"
                        ? "tel"
                        : "text"
                  }
                  value={values[field.label] ?? ""}
                  onChange={(e) => updateField(field.label, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  style={inputStyle}
                />
              )}
            </label>
          ))}

          {error && (
            <p
              role="alert"
              style={{
                padding: "0.75rem 1rem",
                background: "var(--color-error-bg)",
                color: "var(--color-error)",
                border: "1px solid var(--color-error-border)",
                borderRadius: "var(--radius)",
                fontSize: "0.88rem",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn"
            disabled={submitting}
            aria-busy={submitting}
            style={{ alignSelf: "flex-start", minHeight: 44 }}
          >
            {submitting ? "Sending…" : (props.submitLabel ?? "Submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.85rem 1.1rem",
  minHeight: 44,
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "1rem",
  fontFamily: "inherit",
};
