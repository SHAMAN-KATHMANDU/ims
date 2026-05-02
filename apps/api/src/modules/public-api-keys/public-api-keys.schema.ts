import { z } from "zod";

export const CreatePublicApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  tenantDomainId: z.string().uuid("tenantDomainId must be a UUID"),
  rateLimitPerMin: z.number().int().min(1).max(10_000).optional(),
});

export type CreatePublicApiKeyInput = z.infer<typeof CreatePublicApiKeySchema>;
