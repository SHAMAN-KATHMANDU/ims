import { describe, it, expect } from "vitest";
import {
  PaymentMethodConfigSchema,
  UpsertPaymentMethodsSchema,
} from "./tenant-settings.schema";

describe("PaymentMethodConfigSchema", () => {
  it("accepts a valid payment method", () => {
    const result = PaymentMethodConfigSchema.parse({
      id: "pm_cash",
      code: "CASH",
      label: "Cash",
      enabled: true,
      order: 0,
    });
    expect(result.code).toBe("CASH");
  });

  it("rejects invalid code format", () => {
    expect(() =>
      PaymentMethodConfigSchema.parse({
        id: "pm_cash",
        code: "cash-method",
        label: "Cash",
        enabled: true,
        order: 0,
      }),
    ).toThrow();
  });
});

describe("UpsertPaymentMethodsSchema", () => {
  it("accepts a valid list", () => {
    const result = UpsertPaymentMethodsSchema.parse({
      paymentMethods: [
        {
          id: "pm_cash",
          code: "CASH",
          label: "Cash",
          enabled: true,
          order: 0,
        },
        {
          id: "pm_card",
          code: "CARD",
          label: "Card",
          enabled: false,
          order: 1,
        },
      ],
    });
    expect(result.paymentMethods).toHaveLength(2);
  });

  it("rejects duplicate codes", () => {
    expect(() =>
      UpsertPaymentMethodsSchema.parse({
        paymentMethods: [
          {
            id: "pm_1",
            code: "CASH",
            label: "Cash",
            enabled: true,
            order: 0,
          },
          {
            id: "pm_2",
            code: "CASH",
            label: "Cash 2",
            enabled: true,
            order: 1,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects when all methods are disabled", () => {
    expect(() =>
      UpsertPaymentMethodsSchema.parse({
        paymentMethods: [
          {
            id: "pm_card",
            code: "CARD",
            label: "Card",
            enabled: false,
            order: 0,
          },
        ],
      }),
    ).toThrow();
  });
});
