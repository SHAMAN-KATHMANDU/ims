/**
 * Worker: form-submission-email
 *
 * Processes jobs enqueued when a tenant-site form block is submitted with
 * submitTo='email'. For each job it:
 *   1. Loads the FormSubmission row (fields, tenantId, etc.)
 *   2. Resolves recipient list: block-level recipients → SiteConfig.contact.email → error
 *   3. Sends an HTML+text notification email via the shared email transport
 *   4. Updates FormSubmission.deliveredAt on success
 *   5. Updates FormSubmission.lastError + attemptCount on failure and re-throws
 *      (BullMQ will retry according to the queue's retry policy)
 *   6. Writes an audit log entry on success or failure
 *
 * Rate-limit: BullMQ concurrency=2 so no more than 2 emails fly in parallel.
 * Max attempts: 3 (configured in formSubmissionEmailQueue defaultJobOptions).
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue.config";
import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import { sendEmail } from "@/lib/email/email";
import auditRepository from "@/modules/audit/audit.repository";
import {
  renderSubject,
  renderHtml,
  renderText,
  type FormField,
} from "@/modules/public-form-submissions/templates/form-submission";

export interface FormSubmissionEmailJobData {
  submissionId: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Recipient resolution
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Parses and validates an email string.
 * Returns null if the value doesn't look like an email address.
 */
function isValidEmail(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Extracts a list of recipient addresses for the given submission.
 *
 * Priority order:
 *   1. `recipients` field on the form block (array of emails stored in
 *      FormSubmission metadata — passed as part of the job payload via fields)
 *   2. SiteConfig.contact.email for the tenant
 *
 * Throws an Error with a descriptive message if no valid address is found
 * so the job fails with a clear error recorded in FormSubmission.lastError.
 */
export async function resolveRecipients(
  tenantId: string,
  blockRecipients: string[],
): Promise<string[]> {
  // 1. Block-level recipients (already extracted by producer)
  const valid = blockRecipients.filter(isValidEmail);
  if (valid.length > 0) return valid;

  // 2. Fallback: SiteConfig.contact.email
  const config = await basePrisma.siteConfig.findUnique({
    where: { tenantId },
    select: { contact: true },
  });

  const contact = config?.contact as Record<string, unknown> | null;
  const email = contact?.email;

  if (isValidEmail(email)) return [email as string];

  throw new Error(
    `No email recipients configured for tenant ${tenantId}. ` +
      "Set SiteConfig.contact.email or configure form block recipients.",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Worker
// ──────────────────────────────────────────────────────────────────────────────

const formSubmissionEmailWorker = new Worker<FormSubmissionEmailJobData>(
  "form-submission-email",
  async (job: Job<FormSubmissionEmailJobData>) => {
    const { submissionId } = job.data;

    // Load submission
    const submission = await basePrisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { tenant: { select: { name: true } } },
    });

    if (!submission) {
      logger.warn(
        `[FormSubmissionEmailWorker] Submission ${submissionId} not found; skipping`,
      );
      return;
    }

    // Parse fields
    const rawFields = submission.fields as unknown;
    const fields: FormField[] = Array.isArray(rawFields)
      ? (rawFields as Array<{ label: unknown; value: unknown }>).map((f) => ({
          label: String(f?.label ?? ""),
          value: String(f?.value ?? ""),
        }))
      : [];

    // Extract block-level recipients if stored in fields
    // Producers may prepend a synthetic "__recipients__" field; we strip it.
    const recipientField = fields.find((f) => f.label === "__recipients__");
    const blockRecipients = recipientField
      ? recipientField.value
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
      : [];
    const visibleFields = fields.filter((f) => f.label !== "__recipients__");

    // Increment attempt count (best-effort; don't fail job on DB error here)
    await basePrisma.formSubmission
      .update({
        where: { id: submissionId },
        data: { attemptCount: { increment: 1 } },
      })
      .catch((err: unknown) =>
        logger.warn(
          `[FormSubmissionEmailWorker] Could not increment attemptCount for ${submissionId}`,
          undefined,
          { err },
        ),
      );

    try {
      // Resolve recipients
      const recipients = await resolveRecipients(
        submission.tenantId,
        blockRecipients,
      );

      const meta = {
        formLabel: "Contact Form",
        submittedAt: submission.createdAt,
        submissionId: submission.id,
        tenantName: submission.tenant?.name ?? undefined,
      };

      // Build email content
      const subject = renderSubject(meta);
      const html = renderHtml(visibleFields, meta);
      const text = renderText(visibleFields, meta);

      // Send
      await sendEmail({ to: recipients, subject, html, text });

      // Mark delivered
      await basePrisma.formSubmission.update({
        where: { id: submissionId },
        data: { deliveredAt: new Date() },
      });

      // Audit log — success
      await auditRepository
        .create({
          tenantId: submission.tenantId,
          userId: "system",
          action: "FORM_SUBMISSION_EMAIL_SENT",
          resource: "FORM_SUBMISSION",
          resourceId: submissionId,
          details: { recipients },
        })
        .catch((err: unknown) =>
          logger.warn(
            `[FormSubmissionEmailWorker] Audit log (success) failed for ${submissionId}`,
            undefined,
            { err },
          ),
        );

      logger.info(
        `[FormSubmissionEmailWorker] Email sent for submission ${submissionId}`,
        undefined,
        { recipients },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      logger.error(
        `[FormSubmissionEmailWorker] Send failed for submission ${submissionId}: ${message}`,
      );

      // Persist error — best-effort
      await basePrisma.formSubmission
        .update({
          where: { id: submissionId },
          data: { lastError: message.slice(0, 1000) },
        })
        .catch((dbErr: unknown) =>
          logger.warn(
            `[FormSubmissionEmailWorker] Could not persist lastError for ${submissionId}`,
            undefined,
            { dbErr },
          ),
        );

      // Audit log — failure
      await auditRepository
        .create({
          tenantId: submission.tenantId,
          userId: "system",
          action: "FORM_SUBMISSION_EMAIL_FAILED",
          resource: "FORM_SUBMISSION",
          resourceId: submissionId,
          details: { error: message.slice(0, 500) },
        })
        .catch((auditErr: unknown) =>
          logger.warn(
            `[FormSubmissionEmailWorker] Audit log (failure) failed for ${submissionId}`,
            undefined,
            { auditErr },
          ),
        );

      throw error; // Re-throw → BullMQ will retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

formSubmissionEmailWorker.on("failed", (job, err) => {
  logger.error(
    `[FormSubmissionEmailWorker] Job ${job?.id} permanently failed: ${err.message}`,
  );
});

export default formSubmissionEmailWorker;
