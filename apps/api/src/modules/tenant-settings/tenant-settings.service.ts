import tenantSettingsRepository, {
  TenantSettingsRepository,
} from "./tenant-settings.repository";
import type {
  PaymentMethodConfigDto,
  UpsertPaymentMethodsDto,
} from "./tenant-settings.schema";

export interface TenantPaymentMethodConfig {
  id: string;
  code: string;
  label: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_PAYMENT_METHODS: TenantPaymentMethodConfig[] = [
  { id: "pm_cash", code: "CASH", label: "Cash", enabled: true, order: 0 },
  { id: "pm_card", code: "CARD", label: "Card", enabled: true, order: 1 },
  {
    id: "pm_cheque",
    code: "CHEQUE",
    label: "Cheque",
    enabled: true,
    order: 2,
  },
  {
    id: "pm_fonepay",
    code: "FONEPAY",
    label: "Fonepay",
    enabled: true,
    order: 3,
  },
  { id: "pm_qr", code: "QR", label: "QR", enabled: true, order: 4 },
];

function normalizeMethods(
  methods: PaymentMethodConfigDto[] | TenantPaymentMethodConfig[],
): TenantPaymentMethodConfig[] {
  return [...methods]
    .map((method, index) => ({
      id: String(method.id).trim(),
      code: String(method.code).trim().toUpperCase(),
      label: String(method.label).trim(),
      enabled: Boolean(method.enabled),
      order: index,
    }))
    .sort((a, b) => a.order - b.order)
    .map((method, index) => ({ ...method, order: index }));
}

function asPaymentMethods(
  value: unknown,
): TenantPaymentMethodConfig[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value
    .filter((method) => method && typeof method === "object")
    .map((method, index) => {
      const row = method as Record<string, unknown>;
      return {
        id: typeof row.id === "string" ? row.id : `pm_${index}`,
        code: typeof row.code === "string" ? row.code : "",
        label: typeof row.label === "string" ? row.label : "",
        enabled: row.enabled !== false,
        order: typeof row.order === "number" ? row.order : index,
      };
    })
    .filter((method) => method.code && method.label);

  if (parsed.length === 0) return undefined;
  return normalizeMethods(parsed);
}

export class TenantSettingsService {
  constructor(private readonly repo: TenantSettingsRepository) {}

  async getPaymentMethods(
    tenantId: string,
  ): Promise<{ paymentMethods: TenantPaymentMethodConfig[] }> {
    const settings = await this.repo.getTenantSettings(tenantId);
    const methods = asPaymentMethods(settings?.paymentMethods);
    const hasEnabled = methods?.some((method) => method.enabled) ?? false;
    return {
      paymentMethods: methods && hasEnabled ? methods : DEFAULT_PAYMENT_METHODS,
    };
  }

  async upsertPaymentMethods(
    tenantId: string,
    dto: UpsertPaymentMethodsDto,
  ): Promise<{ paymentMethods: TenantPaymentMethodConfig[] }> {
    const normalized = normalizeMethods(dto.paymentMethods);
    const hasEnabled = normalized.some((method) => method.enabled);
    if (!hasEnabled) {
      throw Object.assign(
        new Error("At least one payment method must be enabled"),
        {
          statusCode: 400,
        },
      );
    }

    const currentSettings = (await this.repo.getTenantSettings(tenantId)) ?? {};
    const nextSettings: Record<string, unknown> = {
      ...currentSettings,
      paymentMethods: normalized,
    };

    await this.repo.updateTenantSettings(tenantId, nextSettings);
    return { paymentMethods: normalized };
  }

  async getPaymentMethodLabelMap(
    tenantId: string,
  ): Promise<Map<string, string>> {
    const { paymentMethods } = await this.getPaymentMethods(tenantId);
    return new Map(paymentMethods.map((method) => [method.code, method.label]));
  }

  async assertMethodAllowed(
    tenantId: string,
    methodCode: string,
  ): Promise<void> {
    const { paymentMethods } = await this.getPaymentMethods(tenantId);
    const matched = paymentMethods.find((method) => method.code === methodCode);
    if (!matched || !matched.enabled) {
      throw Object.assign(
        new Error(`Unsupported payment method: ${methodCode}`),
        { statusCode: 400 },
      );
    }
  }
}

export default new TenantSettingsService(tenantSettingsRepository);
