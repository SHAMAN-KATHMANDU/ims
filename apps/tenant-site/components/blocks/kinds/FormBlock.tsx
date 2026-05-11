"use client";

/**
 * form block — dynamic contact / lead-capture form.
 *
 * Field rendering lives in `./form/FormFields` (re-used by the inspector
 * preview). Validation lives in `./form/validate`. This file owns the
 * page-level chrome (heading, description, submit button, success
 * screen) and the submission round-trip.
 *
 * On submit:
 *   1. Run client-side validation (errors render inline next to each
 *      field; submit aborts with a focus to the first invalid input).
 *   2. POST to the same-origin proxy at `/api/public/form-submissions`
 *      which forwards to the API. Backend re-validates.
 *   3. On success: swap to the success screen with the configured
 *      message; on failure: show the error inline and keep the form
 *      values so the user doesn't lose their work.
 */

import { useEffect, useRef, useState } from "react";
import type { FormBlockProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { FormFields, validateFormFields } from "@repo/blocks";

export function FormBlock({
  node,
  props,
}: BlockComponentProps<FormBlockProps>) {
  const fields = props.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(fields),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  // Re-init values when the field list changes (editor live-edits the
  // schema without a full reload). Keyed on the labels so a value-only
  // edit doesn't reset everything mid-typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setValues(initialValues(fields));
    setErrors({});
  }, [fields.length, fields.map((f) => f.label).join("|")]);

  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const sectionPad = wrapperHasPadY ? undefined : "var(--section-padding) 0";

  const updateField = (label: string, value: string) => {
    setValues((v) => ({ ...v, [label]: value }));
    if (errors[label]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[label];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validateFormFields(fields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus the first invalid field so keyboard + screen-reader users
      // land on the problem instead of the page jumping silently.
      const firstInvalidLabel = fields.find(
        (f) => validationErrors[f.label] !== undefined,
      )?.label;
      if (firstInvalidLabel && formRef.current) {
        const el = formRef.current.querySelector<HTMLElement>(
          `[name="${cssEscape(firstInvalidLabel)}"]`,
        );
        el?.focus();
      }
      return;
    }
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
          ...(props.recipients && props.recipients.length > 0
            ? { recipients: props.recipients }
            : {}),
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
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
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
              color: "var(--color-success, #15803d)",
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

  const buttonAlign = props.buttonAlignment ?? "start";
  const buttonClass =
    props.buttonStyle === "outline"
      ? "btn btn-outline"
      : props.buttonStyle === "ghost"
        ? "btn btn-ghost"
        : "btn";

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
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <FormFields
            fields={fields}
            values={values}
            onChange={updateField}
            errors={errors}
          />

          {submitError && (
            <p
              role="alert"
              style={{
                padding: "0.75rem 1rem",
                background: "var(--color-error-bg, #fef2f2)",
                color: "var(--color-error, #b91c1c)",
                border: "1px solid var(--color-error-border, #fecaca)",
                borderRadius: "var(--radius)",
                fontSize: "0.88rem",
              }}
            >
              {submitError}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent:
                buttonAlign === "stretch"
                  ? "stretch"
                  : buttonAlign === "center"
                    ? "center"
                    : "flex-start",
            }}
          >
            <button
              type="submit"
              className={buttonClass}
              disabled={submitting}
              aria-busy={submitting}
              style={{
                minHeight: 44,
                width: buttonAlign === "stretch" ? "100%" : undefined,
              }}
            >
              {submitting ? "Sending…" : (props.submitLabel ?? "Submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function initialValues(
  fields: FormBlockProps["fields"],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields ?? []) {
    out[field.label] = field.defaultValue ?? "";
  }
  return out;
}

// Minimal CSS.escape polyfill for old browsers.
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
}
