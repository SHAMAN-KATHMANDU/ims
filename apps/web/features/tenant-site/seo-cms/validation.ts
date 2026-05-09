import { z } from "zod";

export const SeoConfigSchema = z.object({
  siteTitle: z.string().max(55, "Title too long"),
  siteDescription: z.string().max(155, "Description too long"),
  siteKeywords: z.string().optional(),
  twitterHandle: z.string().optional(),
  ogImage: z.string().url("Invalid URL").optional(),
});

export type SeoConfigInput = z.infer<typeof SeoConfigSchema>;
