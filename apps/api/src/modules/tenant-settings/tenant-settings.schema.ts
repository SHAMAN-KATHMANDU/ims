import { z } from "zod";

const PAYMENT_METHOD_CODE_REGEX = /^[A-Z0-9_]{2,32}$/;

export const PaymentMethodConfigSchema = z.object({
  id: z.string().min(1, "Payment method id is required").max(64),
  code: z
    .string()
    .trim()
    .min(2, "Payment method code is required")
    .max(32, "Payment method code must be at most 32 characters")
    .regex(
      PAYMENT_METHOD_CODE_REGEX,
      "Code must be uppercase letters, numbers, or underscores",
    ),
  label: z
    .string()
    .trim()
    .min(1, "Payment method label is required")
    .max(60, "Payment method label must be at most 60 characters"),
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

export const UpsertPaymentMethodsSchema = z
  .object({
    paymentMethods: z
      .array(PaymentMethodConfigSchema)
      .min(1, "At least one payment method is required")
      .max(30, "Too many payment methods"),
  })
  .superRefine((data, ctx) => {
    const normalizedCodes = new Set<string>();
    let enabledCount = 0;

    data.paymentMethods.forEach((method, index) => {
      const code = method.code.toUpperCase();
      if (normalizedCodes.has(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate payment method code: ${method.code}`,
          path: ["paymentMethods", index, "code"],
        });
      } else {
        normalizedCodes.add(code);
      }

      if (method.enabled) enabledCount += 1;
    });

    if (enabledCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one payment method must be enabled",
        path: ["paymentMethods"],
      });
    }
  });

export type PaymentMethodConfigDto = z.infer<typeof PaymentMethodConfigSchema>;
export type UpsertPaymentMethodsDto = z.infer<
  typeof UpsertPaymentMethodsSchema
>;
