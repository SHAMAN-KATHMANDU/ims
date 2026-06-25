/**
 * CRM feature Zod schemas.
 */

import { z } from "zod";
import {
  ContactProfileFieldsSchema,
  WORKFLOW_TRIGGER_VALUES,
  WORKFLOW_ACTION_VALUES,
  parseWorkflowActionConfig,
} from "@repo/shared";

// ── Shared field validators ─────────────────────────────────────────────────

/**
 * A free-text name/title that must contain meaningful content: non-empty after
 * trimming and containing at least one letter. Rejects junk like "123" or ".".
 */
export function meaningfulText(opts: {
  requiredMessage: string;
  invalidMessage: string;
  max?: number;
}) {
  return z
    .string()
    .max(opts.max ?? 200)
    .refine((v) => v.trim().length > 0, opts.requiredMessage)
    .refine((v) => /\p{L}/u.test(v), opts.invalidMessage);
}

/**
 * A required free-text value that must be non-empty after trimming. Unlike
 * {@link meaningfulText} it allows purely numeric/symbolic content (e.g. a task
 * title of "123"), but rejects whitespace-only input.
 */
export function trimmedRequired(opts: {
  requiredMessage: string;
  max?: number;
}) {
  return z
    .string()
    .max(opts.max ?? 200)
    .refine((v) => v.trim().length > 0, opts.requiredMessage);
}

/**
 * Common gTLDs accepted in addition to any 2-letter country-code TLD (e.g. .np,
 * .uk). Keeps junk domains like "acme.cwedfghjk" out without shipping the full
 * IANA list.
 */
const KNOWN_TLDS = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "int",
  "info",
  "biz",
  "name",
  "pro",
  "app",
  "dev",
  "io",
  "ai",
  "tech",
  "online",
  "site",
  "store",
  "shop",
  "cloud",
  "digital",
  "agency",
  "company",
  "solutions",
  "services",
  "technology",
  "international",
  "media",
  "news",
  "blog",
  "design",
  "studio",
  "world",
  "live",
  "life",
  "xyz",
  "tv",
  "me",
  "co",
]);

/** True when `value` is an http(s) URL whose host ends in a recognised TLD. */
export function isValidWebsiteUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname;
  const labels = host.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0)) return false;
  const tld = labels[labels.length - 1]!.toLowerCase();
  // 2-letter country-code TLDs (.np, .uk, …) or a recognised generic TLD.
  return /^[a-z]{2}$/.test(tld) || KNOWN_TLDS.has(tld);
}

/** Optional website field: blank is allowed, otherwise must be a valid URL. */
export const websiteField = z
  .string()
  .max(200)
  .refine(
    (v) => v.trim() === "" || isValidWebsiteUrl(v.trim()),
    "Please enter a valid website URL",
  )
  .optional()
  .or(z.literal(""));

export const ContactSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(50).optional(),
    companyId: z.string().uuid().optional().nullable(),
  })
  .merge(ContactProfileFieldsSchema);

export const LeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyName: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const DealSchema = z.object({
  name: meaningfulText({
    requiredMessage: "Name is required",
    invalidMessage: "Please enter a valid deal name",
  }),
  value: z.coerce.number().min(0),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  pipelineId: z.string().uuid().optional(),
  expectedCloseDate: z.string().optional(),
});

export const TaskSchema = z.object({
  title: trimmedRequired({ requiredMessage: "Title is required" }),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
});

export const CompanySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  website: websiteField,
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional().nullable(),
});

export const LogActivitySchema = z.object({
  type: z.enum(["CALL", "MEETING"]),
  subject: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  activityAt: z.string().min(1, "Date and time is required"),
});

export const WorkflowRuleSchema = z
  .object({
    trigger: z.enum(WORKFLOW_TRIGGER_VALUES),
    triggerStageId: z.string().max(100).optional().nullable(),
    action: z.enum(WORKFLOW_ACTION_VALUES),
    actionConfig: z.record(z.unknown()).default({}),
    ruleOrder: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    // Match API/workflow.engine: null = any stage; undefined/"" = incomplete.
    if (
      (value.trigger === "STAGE_ENTER" || value.trigger === "STAGE_EXIT") &&
      (value.triggerStageId === undefined || value.triggerStageId === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerStageId"],
        message: "Select a specific stage or Any stage",
      });
    }

    try {
      parseWorkflowActionConfig(value.action, value.actionConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actionConfig", ...issue.path],
            message: issue.message,
          });
        }
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionConfig"],
        message:
          error instanceof Error
            ? error.message
            : "Invalid workflow action config",
      });
    }
  });

export const CreateWorkflowFormSchema = z.object({
  pipelineId: z.string().uuid("Select a pipeline"),
  name: z.string().min(1, "Name is required").max(255),
  isActive: z.boolean().default(true),
  rules: z.array(WorkflowRuleSchema).optional().default([]),
});

export const UpdateWorkflowFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  isActive: z.boolean().default(true),
  rules: z.array(WorkflowRuleSchema).optional().default([]),
});

export type ContactInput = z.infer<typeof ContactSchema>;
export type LeadInput = z.infer<typeof LeadSchema>;
export type DealInput = z.infer<typeof DealSchema>;
export type TaskInput = z.infer<typeof TaskSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
export type LogActivityInput = z.infer<typeof LogActivitySchema>;
export type CreateWorkflowFormValues = z.infer<typeof CreateWorkflowFormSchema>;
export type UpdateWorkflowFormValues = z.infer<typeof UpdateWorkflowFormSchema>;
export type WorkflowRuleFormValues = z.infer<typeof WorkflowRuleSchema>;
