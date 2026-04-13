/**
 * Zod schemas for platform-admin site/domain forms.
 */

import { z } from "zod";

const hostnameRegex =
  /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;

export const AddDomainFormSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Hostname is required")
    .max(253)
    .regex(hostnameRegex, "Enter a valid hostname like www.acme.com"),
  appType: z.enum(["WEBSITE", "IMS", "API"]),
  isPrimary: z.boolean().default(false),
});

export type AddDomainFormInput = z.infer<typeof AddDomainFormSchema>;

export const EnableWebsiteFormSchema = z.object({
  templateSlug: z.string().trim().min(1).optional(),
});

export type EnableWebsiteFormInput = z.infer<typeof EnableWebsiteFormSchema>;
