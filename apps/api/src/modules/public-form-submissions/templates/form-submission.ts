/**
 * Email templates for form-submission notifications.
 *
 * Deliberately uses plain template literals — no extra templating dependency.
 * Keep HTML simple: single-column table, inline styles, no external assets.
 */

export interface FormField {
  label: string;
  value: string;
}

export interface FormSubmissionMeta {
  formLabel: string;
  submittedAt: Date;
  submissionId: string;
  tenantName?: string;
}

/**
 * Subject line: "New form submission: <formLabel> — Apr 29 2026 14:03 UTC"
 */
export function renderSubject(meta: FormSubmissionMeta): string {
  const dateStr = meta.submittedAt.toUTCString().replace(/GMT/, "UTC");
  return `New form submission: ${meta.formLabel} — ${dateStr}`;
}

/**
 * Plain-text body — easily readable in mail clients that strip HTML.
 */
export function renderText(
  fields: FormField[],
  meta: FormSubmissionMeta,
): string {
  const rows = fields
    .map((f) => `${f.label}: ${f.value}`)
    .join("\n");

  return [
    `New form submission: ${meta.formLabel}`,
    `Submitted at: ${meta.submittedAt.toISOString()}`,
    `Submission ID: ${meta.submissionId}`,
    "",
    "--- Fields ---",
    rows,
  ].join("\n");
}

/**
 * HTML body — single-column, inline styles, no images or external CSS.
 */
export function renderHtml(
  fields: FormField[],
  meta: FormSubmissionMeta,
): string {
  const tenantLine = meta.tenantName
    ? `<p style="margin:0 0 4px 0;color:#6b7280;font-size:13px;">Site: ${escHtml(meta.tenantName)}</p>`
    : "";

  const fieldRows = fields
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;width:30%">${escHtml(f.label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;word-break:break-word">${escHtml(f.value)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <tr>
      <td style="padding:20px 24px;background:#4f46e5">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff">New Form Submission</h1>
        ${tenantLine}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px">
        <p style="margin:0 0 4px 0;color:#374151;font-size:14px"><strong>Form:</strong> ${escHtml(meta.formLabel)}</p>
        <p style="margin:0 0 16px 0;color:#6b7280;font-size:13px">Submitted: ${meta.submittedAt.toUTCString()}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:4px;border-collapse:collapse">
          ${fieldRows}
        </table>
        <p style="margin:16px 0 0 0;color:#9ca3af;font-size:11px">Submission ID: ${escHtml(meta.submissionId)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
