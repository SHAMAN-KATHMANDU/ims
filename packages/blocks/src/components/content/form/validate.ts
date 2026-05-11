/**
 * Client-side validation for FormBlock.
 *
 * Browser-level validation (HTML5 `required`, `type=email`, `pattern`,
 * `min`, `max`) does most of the work — this layer adds the friendly
 * error messages and lets the renderer show them inline beside each
 * field instead of relying on the native browser bubble (which is
 * inconsistent across browsers and can't be themed).
 *
 * Returns a map of `{ [field.label]: errorMessage }`. Empty map = pass.
 */

import type { FormFieldDef } from "@repo/shared";

export function validateFormFields(
  fields: FormFieldDef[],
  values: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const raw = values[field.label] ?? "";
    const trimmed = raw.trim();
    if (field.required && trimmed.length === 0) {
      errors[field.label] = `${field.label} is required.`;
      continue;
    }
    if (trimmed.length === 0) continue; // optional + empty: skip remaining checks

    if (field.kind === "email" && !EMAIL_RE.test(trimmed)) {
      errors[field.label] = "Enter a valid email address.";
      continue;
    }
    if (field.kind === "url") {
      try {
        // Allow user input without protocol — prepend if missing so
        // `URL` doesn't reject "shop.example/about". Renderer keeps
        // the user's literal string.
        const url = /^https?:\/\//i.test(trimmed)
          ? new URL(trimmed)
          : new URL(`https://${trimmed}`);
        if (!url.host) throw new Error("no host");
      } catch {
        errors[field.label] = "Enter a valid URL.";
        continue;
      }
    }
    if (field.kind === "number") {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        errors[field.label] = "Enter a number.";
        continue;
      }
      if (field.min !== undefined && n < field.min) {
        errors[field.label] = `Must be at least ${field.min}.`;
        continue;
      }
      if (field.max !== undefined && n > field.max) {
        errors[field.label] = `Must be at most ${field.max}.`;
        continue;
      }
    }
    if (field.pattern && !new RegExp(field.pattern).test(trimmed)) {
      errors[field.label] = "Doesn't match the expected format.";
      continue;
    }
    if (
      (field.kind === "text" || field.kind === "textarea") &&
      field.min !== undefined &&
      trimmed.length < field.min
    ) {
      errors[field.label] = `Must be at least ${field.min} characters.`;
      continue;
    }
    if (
      (field.kind === "text" || field.kind === "textarea") &&
      field.max !== undefined &&
      trimmed.length > field.max
    ) {
      errors[field.label] = `Must be at most ${field.max} characters.`;
      continue;
    }
  }
  return errors;
}

// RFC 5322 is a beast — this is the practical-good-enough version.
// Mirrors Zod's z.string().email() shape so client + server agree.
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
