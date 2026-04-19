import { z } from "zod";

const codeRe = /^[A-Z0-9-]+$/;

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .refine(
    (s) => s === "" || z.string().email().safeParse(s).success,
    "Enter a valid email",
  )
  .optional();

const optionalDateString = z
  .string()
  .trim()
  .refine(
    (s) => s === "" || !Number.isNaN(new Date(s).getTime()),
    "Enter a valid date",
  )
  .optional();

export const IssueGiftCardFormSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be at least 6 characters")
    .max(64, "Code must be 64 characters or fewer")
    .transform((s) => s.trim().toUpperCase())
    .refine(
      (s) => codeRe.test(s),
      "Code may only contain A-Z, 0-9, and hyphens",
    ),
  amount: z.coerce
    .number({ invalid_type_error: "Amount is required" })
    .int("Amount must be a whole number of cents")
    .positive("Amount must be greater than 0"),
  recipientEmail: optionalEmail,
  expiresAt: optionalDateString,
  purchaserId: z
    .string()
    .trim()
    .refine(
      (s) =>
        s === "" ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          s,
        ),
      "Enter a valid UUID",
    )
    .optional(),
});

export type IssueGiftCardFormInput = z.infer<typeof IssueGiftCardFormSchema>;
