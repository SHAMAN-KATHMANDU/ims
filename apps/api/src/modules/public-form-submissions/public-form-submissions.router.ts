/**
 * Public form submissions — unauthenticated endpoint for the tenant-site
 * form block. Tenant resolved from Host header. Stores the submission and
 * optionally creates a CRM Lead or sends an email notification.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { EnvFeature } from "@repo/shared";
import { asyncHandler, AppError } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import { sendControllerError } from "@/utils/controllerError";
import prisma from "@/config/prisma";
import sitesRepo from "@/modules/sites/sites.repository";
import automationService from "@/modules/automation/automation.service";
import { formSubmissionEmailQueue } from "@/queues/queue.config";
import { logger } from "@/config/logger";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

const SubmitFormSchema = z.object({
  formId: z.string().uuid().optional(), // Reference to a stored Form
  fields: z
    .array(
      z.object({
        label: z.string().max(200),
        value: z.string().max(10_000),
      }),
    )
    .max(30),
  submitTo: z.enum(["email", "crm-lead"]).default("email"),
  /**
   * Optional per-block recipient overrides from the form block configuration.
   * When provided, emails go to these addresses; otherwise falls back to
   * SiteConfig.contact.email.
   */
  recipients: z
    .array(z.string().email().max(254))
    .max(20)
    .optional()
    .default([]),
});

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Host not resolved" });
      }

      const config = await sitesRepo.findConfig(tenantId);
      if (!config || !config.websiteEnabled || !config.isPublished) {
        return res.status(404).json({ message: "Not found" });
      }

      const parsed = SubmitFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message ?? "Invalid form data",
        });
      }

      const { formId, fields, submitTo, recipients } = parsed.data;

      // Store block recipients as a synthetic "__recipients__" field so the
      // worker can retrieve them without an extra column on FormSubmission.
      const fieldsToStore =
        recipients.length > 0
          ? [
              { label: "__recipients__", value: recipients.join(",") },
              ...fields,
            ]
          : fields;

      // If formId provided, verify it exists and increment submission count
      if (formId) {
        const form = await prisma.form.findFirst({
          where: { id: formId, tenantId, deletedAt: null },
        });
        if (!form) {
          return res.status(400).json({
            message: "Referenced form not found",
          });
        }
      }

      const submission = await prisma.$transaction(async (tx) => {
        const sub = await tx.formSubmission.create({
          data: {
            tenantId,
            formId: formId || null,
            fields:
              fieldsToStore as unknown as import("@prisma/client").Prisma.InputJsonValue,
            submitTo,
          },
        });

        // Increment submission count if formId provided
        if (formId) {
          await tx.form.update({
            where: { id: formId },
            data: { submissionCount: { increment: 1 } },
          });
        }

        return sub;
      });

      // If submitTo is crm-lead, try to create a lead from the form data.
      if (submitTo === "crm-lead") {
        try {
          const getField = (label: string) =>
            fields.find((f) => f.label.toLowerCase() === label.toLowerCase())
              ?.value ?? "";

          const name = getField("name") || getField("full name") || "Form Lead";
          const email = getField("email") || undefined;
          const phone =
            getField("phone") || getField("phone number") || undefined;
          const notes = fields.map((f) => `${f.label}: ${f.value}`).join("\n");

          const adminUser = await prisma.user.findFirst({
            where: { tenantId, role: { in: ["admin", "superAdmin"] } },
            select: { id: true },
          });
          if (!adminUser) throw new Error("No admin user for lead assignment");

          const lead = await prisma.lead.create({
            data: {
              tenantId,
              name,
              email: email || null,
              phone: phone || null,
              source: "WEBSITE_FORM",
              notes,
              status: "NEW",
              assignedToId: adminUser.id,
              createdById: adminUser.id,
            },
          });

          await prisma.formSubmission.update({
            where: { id: submission.id },
            data: { leadId: lead.id },
          });
        } catch (leadErr) {
          // Lead creation is best-effort — never fail the form submission
          console.error("[form-submissions] CRM lead creation failed", leadErr);
        }
      }

      // Enqueue email notification for submitTo='email' — best-effort.
      // A queue failure must never lose the submission row.
      if (submitTo === "email") {
        formSubmissionEmailQueue
          .add(
            "send-form-submission-email",
            { submissionId: submission.id },
            {
              // Unique jobId prevents duplicate sends on HTTP request retries.
              jobId: `form-submission-email:${submission.id}`,
            },
          )
          .catch((queueErr: unknown) => {
            logger.error(
              "[form-submissions] Failed to enqueue email job",
              undefined,
              { submissionId: submission.id, err: queueErr },
            );
          });
      }

      automationService
        .publishDomainEvent({
          tenantId,
          eventName: "storefront.form.submitted",
          scopeType: "GLOBAL",
          entityType: "FORM_SUBMISSION",
          entityId: submission.id,
          actorUserId: null,
          dedupeKey: `form-submitted:${submission.id}`,
          payload: {
            submissionId: submission.id,
            submitTo,
            fields, // original user-visible fields (no __recipients__ synthetic field)
            leadId: submission.leadId ?? null,
          },
        })
        .catch((err) => {
          console.error("[form-submissions] Automation event failed", err);
        });

      return res.status(201).json({
        message: "Submission received",
        id: submission.id,
      });
    } catch (error) {
      const err = error as AppError;
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Form submission error");
    }
  }),
);

export default router;
