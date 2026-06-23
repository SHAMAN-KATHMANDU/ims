import { z } from "zod";

/** App credentials form — App ID, App Secret, Graph API version, and defaults. */
export const AppCredentialsFormSchema = z.object({
  appId: z
    .string()
    .max(255, "App ID must be at most 255 characters")
    .nullable()
    .optional(),
  appSecret: z
    .string()
    .max(512, "App Secret must be at most 512 characters")
    .optional(),
  graphApiVersion: z
    .string()
    .regex(/^v\d+\.\d+$/, "Graph API version must match format v##.#")
    .nullable()
    .optional(),
  defaultPageId: z
    .string()
    .max(255, "Page ID must be at most 255 characters")
    .nullable()
    .optional(),
  defaultAdAccountId: z
    .string()
    .max(255, "Ad Account ID must be at most 255 characters")
    .nullable()
    .optional(),
});

export type AppCredentialsFormValues = z.infer<typeof AppCredentialsFormSchema>;

/** Test credential form — to verify a token without saving. */
export const TestCredentialFormSchema = z.object({
  kind: z.enum(["PAGE", "ADS"]),
  accessToken: z
    .string()
    .min(1, "Access token is required")
    .max(4096, "Access token must be at most 4096 characters"),
  appSecret: z
    .string()
    .max(512, "App Secret must be at most 512 characters")
    .optional(),
});

export type TestCredentialFormValues = z.infer<typeof TestCredentialFormSchema>;

/** Add credential form — save a PAGE or ADS token. */
export const AddCredentialFormSchema = z.object({
  kind: z.enum(["PAGE", "ADS"]),
  externalId: z
    .string()
    .min(1, "ID is required")
    .max(255, "ID must be at most 255 characters"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  accessToken: z
    .string()
    .min(1, "Access token is required")
    .max(4096, "Access token must be at most 4096 characters"),
});

export type AddCredentialFormValues = z.infer<typeof AddCredentialFormSchema>;
