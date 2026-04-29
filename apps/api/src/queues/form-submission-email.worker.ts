/**
 * Worker: form-submission-email
 *
 * Processes jobs enqueued when a tenant-site form block is submitted with
 * submitTo='email'. For each job it:
 *   1. Loads the FormSubmission row
 *   2. Resolves recipient list: block-level → SiteConfig.contact.email → error
 *   3. Sends HTML+text notification email via shared email transport
 *   4. Sets FormSubmission.deliveredAt on success
 *   5. Sets FormSubmission.lastError + increments attemptCount on failure;
 *      re-throws so BullMQ retries (max 3 attempts, exponential back-off)
 *   6. Writes audit log on success or failure
 *
 * Concurrency: 2 (at most 2 emails in flight at once).
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

function isValidEmail(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Resolves recipient addresses for a submission.
 *
 * Priority:
 *   1. blockRecipients (passed in from the stored __recipients__ synthetic field)
 *   2. SiteConfig.contact.email for the tenant
 *
 * Throws if no valid address is found.
 */
export async function resolveRecipients(
  tenantId: string,
  blockRecipients: string[],
): Promise<string[]> {
  const valid = blockRecipients.filter(isValidEmail);
  if (valid.length > 0) return valid;

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

    // Parse stored fields
    const rawFields = submission.fields as unknown;
    const allFields: FormField[] = Array.isArray(rawFields)
      ? (rawFields as Array<{ label: unknown; value: unknown }>).map((f) => ({
          label: String(f?.label ?? ""),
          value: String(f?.value ?? ""),
        }))
      : [];

    // Extract synthetic __recipients__ field (stripped before rendering)
    const recipientField = allFields.find((f) => f.label === "__recipients__");
    const blockRecipients = recipientField
      ? recipientField.value
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
      : [];
    const visibleFields = allFields.filter((f) => f.label !== "__recipients__");

    // Track attempt count — best-effort, don't fail the job on DB error
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

      await sendEmail({
        to: recipients,
        subject: renderSubject(meta),
        html: renderHtml(visibleFields, meta),
        text: renderText(visibleFields, meta),
      });

      await basePrisma.formSubmission.update({
        where: { id: submissionId },
        data: { deliveredAt: new Date() },
      });

      // Audit log — success (non-fatal)
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
      const message = error instanceof Error ? error.message : String(error);

      logger.error(
        `[FormSubmissionEmailWorker] Send failed for ${submissionId}: ${message}`,
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

      // Audit log — failure (non-fatal)
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

      throw error; // Re-throw → BullMQ retries
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
