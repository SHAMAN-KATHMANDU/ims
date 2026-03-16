import { z } from "zod";

export const CreateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export const UpdateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export const CreateCrmJourneyTypeSchema = z.object({
  name: z.string().min(1, "Journey type name is required").max(100),
});

export const UpdateCrmJourneyTypeSchema = z.object({
  name: z.string().min(1, "Journey type name is required").max(100),
});

export type CreateCrmSourceDto = z.infer<typeof CreateCrmSourceSchema>;
export type UpdateCrmSourceDto = z.infer<typeof UpdateCrmSourceSchema>;
export type CreateCrmJourneyTypeDto = z.infer<
  typeof CreateCrmJourneyTypeSchema
>;
export type UpdateCrmJourneyTypeDto = z.infer<
  typeof UpdateCrmJourneyTypeSchema
>;

/** Query for GET sources/journey-types. When both absent, API returns all. */
const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? undefined : Math.max(1, parseInt(v) || 1),
    ),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? undefined
        : Math.min(100, Math.max(1, parseInt(v) || 10)),
    ),
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});

export const ListSourcesQuerySchema = listQuerySchema;
export const ListJourneyTypesQuerySchema = listQuerySchema;
