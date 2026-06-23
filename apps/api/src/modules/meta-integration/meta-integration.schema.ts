import { z } from "zod";

/** Upsert the tenant's own Facebook App credentials + defaults. App Secret is
 * optional on update: omit it to keep the stored value, send a new value to
 * replace it, or send an empty string to clear it. */
export const UpsertAppCredentialsSchema = z
  .object({
    appId: z.string().max(255).optional().nullable(),
    appSecret: z.string().max(512).optional(),
    graphApiVersion: z
      .string()
      .regex(/^v\d+\.\d+$/i, "Version must look like v23.0")
      .max(16)
      .optional()
      .nullable(),
    defaultPageId: z.string().max(255).optional().nullable(),
    defaultAdAccountId: z.string().max(255).optional().nullable(),
  })
  .strict();

export const MetaCredentialKindSchema = z.enum(["PAGE", "ADS"]);

/** Add a Page or Ads access token. The token is validated against the Graph
 * API before it is encrypted and stored. */
export const AddCredentialSchema = z
  .object({
    kind: MetaCredentialKindSchema,
    /** Page ID (PAGE) or ad-account id (ADS, with or without the "act_" prefix). */
    externalId: z.string().min(1, "External id is required").max(255),
    name: z.string().min(1, "A label is required").max(255),
    accessToken: z.string().min(1, "Access token is required").max(4096),
  })
  .strict();

/** Validate a token without persisting it (the "Test connection" button). */
export const TestCredentialSchema = z
  .object({
    kind: MetaCredentialKindSchema,
    accessToken: z.string().min(1, "Access token is required").max(4096),
    /** Optional: if provided, appsecret_proof is computed for the test call. */
    appSecret: z.string().max(512).optional(),
  })
  .strict();

export type UpsertAppCredentialsDto = z.infer<
  typeof UpsertAppCredentialsSchema
>;
export type AddCredentialDto = z.infer<typeof AddCredentialSchema>;
export type TestCredentialDto = z.infer<typeof TestCredentialSchema>;
export type MetaCredentialKindValue = z.infer<typeof MetaCredentialKindSchema>;
