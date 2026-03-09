import { z } from "zod";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
] as const;

export const LeadStatusSchema = z.enum(LEAD_STATUSES);

export const CreateLeadSchema = z.object({
  name: z.string().min(1, "Lead name is required").max(255).trim(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  phone: z.string().optional(),
  companyName: z
    .string()
    .max(255)
    .optional()
    .transform((v) => v?.trim() || undefined),
  status: LeadStatusSchema.optional(),
  source: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v?.trim() || undefined),
  notes: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  assignedToId: z.string().uuid().optional(),
});

export const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  email: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v)),
  companyName: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v?.trim())),
  status: LeadStatusSchema.optional(),
  source: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v?.trim())),
  notes: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v?.trim())),
  assignedToId: z.string().uuid().optional(),
});

export const ConvertLeadSchema = z.object({
  contactId: z.string().uuid().optional(),
  dealName: z.string().optional(),
  dealValue: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v != null ? Number(v) : undefined)),
  pipelineId: z.string().uuid().optional(),
});

export const AssignLeadSchema = z.object({
  assignedToId: z.string().uuid().min(1, "assignedToId is required"),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadDto = z.infer<typeof UpdateLeadSchema>;
export type ConvertLeadDto = z.infer<typeof ConvertLeadSchema>;
export type AssignLeadDto = z.infer<typeof AssignLeadSchema>;
