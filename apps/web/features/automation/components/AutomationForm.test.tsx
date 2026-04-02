import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutomationForm } from "./AutomationForm";
import type { AutomationDefinitionFormValues } from "../validation";

vi.mock("@/components/ui/select", () => {
  return {
    Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      aria-label="toggle switch"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/features/crm", () => ({
  usePipelines: () => ({
    data: { pipelines: [{ id: "pipe-1", name: "Default pipeline" }] },
  }),
}));

vi.mock("@/features/locations", () => ({
  useActiveLocations: () => ({
    data: [{ id: "loc-1", name: "Warehouse A" }],
  }),
}));

describe("AutomationForm", () => {
  const baseValues: AutomationDefinitionFormValues = {
    name: "Restock automation",
    description: "Create work when stock is low",
    scopeType: "GLOBAL",
    scopeId: "",
    status: "ACTIVE",
    executionMode: "LIVE",
    suppressLegacyWorkflows: false,
    triggers: [
      {
        eventName: "inventory.stock.low_detected",
        conditions: [],
        delayMinutes: 0,
      },
    ],
    steps: [
      {
        actionType: "workitem.create",
        actionConfig: {
          title: "Create restock task",
          type: "RESTOCK_REQUEST",
          priority: "HIGH",
        },
        continueOnError: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits populated automation values", async () => {
    const onSubmit = vi.fn();

    render(<AutomationForm defaultValues={baseValues} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /save automation/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: "Restock automation",
        suppressLegacyWorkflows: false,
        steps: [
          expect.objectContaining({
            actionType: "workitem.create",
          }),
        ],
      }),
    );
  });

  it("falls back to a compatible action type when trigger selection changes", async () => {
    const onSubmit = vi.fn();

    render(
      <AutomationForm
        defaultValues={{
          ...baseValues,
          triggers: [
            {
              eventName: "sales.sale.created",
              conditions: [],
              delayMinutes: 0,
            },
          ],
          steps: [
            {
              actionType: "transfer.create_draft",
              actionConfig: { payloadPath: "suggestedTransfer" },
              continueOnError: false,
            },
          ],
        }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /save automation/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].steps[0]).toEqual(
      expect.objectContaining({
        actionType: "workitem.create",
        actionConfig: expect.objectContaining({
          title: "Follow up",
        }),
      }),
    );
  });

  it("toggles legacy workflow suppression and supports cancel", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <AutomationForm
        defaultValues={baseValues}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByRole("button", { name: /save automation/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        suppressLegacyWorkflows: true,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
