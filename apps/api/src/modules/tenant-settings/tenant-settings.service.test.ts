import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/prisma", () => ({ default: {} }));

import {
  TenantSettingsService,
  DEFAULT_PAYMENT_METHODS,
} from "./tenant-settings.service";

const mockRepo = {
  getTenantSettings: vi.fn(),
  updateTenantSettings: vi.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const service = new TenantSettingsService(mockRepo as any);

describe("TenantSettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPaymentMethods", () => {
    it("returns defaults when settings row is null", async () => {
      mockRepo.getTenantSettings.mockResolvedValue(null);
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toEqual(DEFAULT_PAYMENT_METHODS);
    });

    it("returns defaults when paymentMethods key is absent", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({ other: "x" });
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toEqual(DEFAULT_PAYMENT_METHODS);
    });

    it("returns defaults when all stored methods are disabled", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        paymentMethods: [
          {
            id: "pm_cash",
            code: "CASH",
            label: "Cash",
            enabled: false,
            order: 0,
          },
        ],
      });
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toEqual(DEFAULT_PAYMENT_METHODS);
    });

    it("returns normalized stored methods when at least one enabled", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        paymentMethods: [
          {
            id: "pm_cash",
            code: "CASH",
            label: "Cash",
            enabled: true,
            order: 0,
          },
          {
            id: "pm_custom",
            code: "MPESA",
            label: "Mpesa",
            enabled: false,
            order: 1,
          },
        ],
      });
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toHaveLength(2);
      expect(result.paymentMethods[0]?.code).toBe("CASH");
      expect(result.paymentMethods[1]?.code).toBe("MPESA");
      expect(result.paymentMethods[0]?.order).toBe(0);
      expect(result.paymentMethods[1]?.order).toBe(1);
    });

    it("filters out entries missing code or label", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        paymentMethods: [
          { id: "pm_ok", code: "CASH", label: "Cash", enabled: true, order: 0 },
          { id: "pm_bad", code: "", label: "NoCode", enabled: true, order: 1 },
          {
            id: "pm_bad2",
            code: "NOLABEL",
            label: "",
            enabled: true,
            order: 2,
          },
        ],
      });
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toHaveLength(1);
      expect(result.paymentMethods[0]?.code).toBe("CASH");
    });

    it("returns defaults when stored paymentMethods is not an array", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        paymentMethods: "not-an-array",
      });
      const result = await service.getPaymentMethods("t1");
      expect(result.paymentMethods).toEqual(DEFAULT_PAYMENT_METHODS);
    });
  });

  describe("upsertPaymentMethods", () => {
    it("throws 400 when no method is enabled", async () => {
      await expect(
        service.upsertPaymentMethods("t1", {
          paymentMethods: [
            {
              id: "pm_cash",
              code: "CASH",
              label: "Cash",
              enabled: false,
              order: 0,
            },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockRepo.updateTenantSettings).not.toHaveBeenCalled();
    });

    it("normalizes codes to uppercase, trims strings, and resequences order", async () => {
      mockRepo.getTenantSettings.mockResolvedValue(null);
      mockRepo.updateTenantSettings.mockResolvedValue(undefined);

      const result = await service.upsertPaymentMethods("t1", {
        paymentMethods: [
          {
            id: "  pm_card ",
            code: " card ",
            label: " Credit Card ",
            enabled: true,
            order: 7,
          },
          {
            id: "pm_cash",
            code: "cash",
            label: "Cash",
            enabled: true,
            order: 3,
          },
        ],
      });

      expect(result.paymentMethods[0]).toMatchObject({
        id: "pm_card",
        code: "CARD",
        label: "Credit Card",
        order: 0,
      });
      expect(result.paymentMethods[1]).toMatchObject({
        code: "CASH",
        order: 1,
      });
    });

    it("preserves other tenant settings fields when updating", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        branding: { theme: "dark" },
        unrelated: "keep-me",
      });
      mockRepo.updateTenantSettings.mockResolvedValue(undefined);

      await service.upsertPaymentMethods("t1", {
        paymentMethods: [
          {
            id: "pm_cash",
            code: "CASH",
            label: "Cash",
            enabled: true,
            order: 0,
          },
        ],
      });

      const [calledTenantId, calledSettings] =
        mockRepo.updateTenantSettings.mock.calls[0]!;
      expect(calledTenantId).toBe("t1");
      expect(calledSettings).toMatchObject({
        branding: { theme: "dark" },
        unrelated: "keep-me",
      });
      expect(calledSettings.paymentMethods).toHaveLength(1);
    });

    it("starts from empty settings when getTenantSettings returns null", async () => {
      mockRepo.getTenantSettings.mockResolvedValue(null);
      mockRepo.updateTenantSettings.mockResolvedValue(undefined);

      await service.upsertPaymentMethods("t1", {
        paymentMethods: [
          {
            id: "pm_cash",
            code: "CASH",
            label: "Cash",
            enabled: true,
            order: 0,
          },
        ],
      });

      expect(mockRepo.updateTenantSettings).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          paymentMethods: expect.arrayContaining([
            expect.objectContaining({ code: "CASH" }),
          ]),
        }),
      );
    });
  });

  describe("getPaymentMethodLabelMap", () => {
    it("returns a Map keyed by code with label values", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
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
            label: "Credit Card",
            enabled: true,
            order: 1,
          },
        ],
      });

      const map = await service.getPaymentMethodLabelMap("t1");
      expect(map.get("CASH")).toBe("Cash");
      expect(map.get("CARD")).toBe("Credit Card");
    });

    it("falls back to default methods when none stored", async () => {
      mockRepo.getTenantSettings.mockResolvedValue(null);
      const map = await service.getPaymentMethodLabelMap("t1");
      expect(map.get("CASH")).toBe("Cash");
      expect(map.get("CARD")).toBe("Card");
    });
  });

  describe("assertMethodAllowed", () => {
    it("resolves for an enabled method", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
        paymentMethods: [
          {
            id: "pm_cash",
            code: "CASH",
            label: "Cash",
            enabled: true,
            order: 0,
          },
        ],
      });
      await expect(
        service.assertMethodAllowed("t1", "CASH"),
      ).resolves.toBeUndefined();
    });

    it("throws 400 for an unknown method code", async () => {
      mockRepo.getTenantSettings.mockResolvedValue(null);
      await expect(
        service.assertMethodAllowed("t1", "BITCOIN"),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 400 when method exists but is disabled", async () => {
      mockRepo.getTenantSettings.mockResolvedValue({
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
      await expect(
        service.assertMethodAllowed("t1", "CARD"),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
