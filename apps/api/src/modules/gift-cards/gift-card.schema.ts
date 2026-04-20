import { z } from "zod";

const statusSchema = z.enum(["ACTIVE", "REDEEMED", "EXPIRED", "VOIDED"]);

const codeSchema = z
  .string()
  .min(6, "Gift card code must be at least 6 characters")
  .max(64)
  .transform((s) => s.trim().toUpperCase())
  .refine(
    (s) => /^[A-Z0-9-]+$/.test(s),
    "Code may only contain A-Z, 0-9, and hyphens",
  );

const emailSchema = z
  .string()
  .email("Invalid email")
  .max(255)
  .transform((s) => s.trim().toLowerCase());

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === "" || v === null || v === undefined
      ? null
      : new Date(v as string | Date),
  );

const optionalDateUpdate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) =>
    v === undefined
      ? undefined
      : v === "" || v === null
        ? null
        : new Date(v as string | Date),
  );

export const CreateGiftCardSchema = z.object({
  code: codeSchema,
  amount: z.coerce.number().int().positive("Amount must be > 0"),
  purchaserId: z.string().uuid().nullish(),
  recipientEmail: emailSchema.nullish(),
  expiresAt: optionalDate,
  status: statusSchema.default("ACTIVE"),
});

export const UpdateGiftCardSchema = z.object({
  recipientEmail: z.union([emailSchema, z.literal(null)]).optional(),
  expiresAt: optionalDateUpdate,
  status: statusSchema.optional(),
  balance: z.coerce.number().int().min(0).optional(),
});

export const GiftCardListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: statusSchema.optional(),
});

export const RedeemGiftCardSchema = z.object({
  code: codeSchema,
  amount: z.coerce.number().int().positive("Redemption amount must be > 0"),
});

export type CreateGiftCardDto = z.infer<typeof CreateGiftCardSchema>;
export type UpdateGiftCardDto = z.infer<typeof UpdateGiftCardSchema>;
export type GiftCardListQuery = z.infer<typeof GiftCardListQuerySchema>;
export type RedeemGiftCardDto = z.infer<typeof RedeemGiftCardSchema>;
