/**
 * CRM feature Zod schemas.
 */

import { z } from "zod";

export const ContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  companyId: z.string().uuid().optional().nullable(),
});

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
  name: z.string().min(1, "Name is required").max(200),
  value: z.coerce.number().min(0),
  contactId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  pipelineId: z.string().uuid().optional(),
  expectedCloseDate: z.string().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
});

export const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const CompanySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional().nullable(),
});

export const LogActivitySchema = z.object({
  type: z.enum(["CALL", "MEETING"]),
  subject: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  activityAt: z.string().min(1, "Date and time is required"),
});

export type ContactInput = z.infer<typeof ContactSchema>;
export type LeadInput = z.infer<typeof LeadSchema>;
export type DealInput = z.infer<typeof DealSchema>;
export type TaskInput = z.infer<typeof TaskSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
export type LogActivityInput = z.infer<typeof LogActivitySchema>;
