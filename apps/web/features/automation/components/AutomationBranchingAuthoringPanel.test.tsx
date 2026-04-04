import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { compileIfElseFlowGraph } from "@repo/shared";
import { AutomationBranchingAuthoringPanel } from "./AutomationBranchingAuthoringPanel";
import type { AutomationDefinitionFormValues } from "../validation";

vi.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./AutomationFlowGraphPreview", () => ({
  AutomationFlowGraphPreview: () => <div data-testid="graph-preview-mock" />,
}));

vi.mock("@/components/ui/select", () => ({
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
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

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

function Harness() {
  const graph = compileIfElseFlowGraph({
    conditions: [{ path: "total", operator: "gte", value: 1 }],
    trueStep: {
      actionType: "notification.send",
      actionConfig: { type: "INFO", title: "T", message: "t" },
    },
    falseStep: {
      actionType: "notification.send",
      actionConfig: { type: "INFO", title: "F", message: "f" },
    },
  });
  const form = useForm<AutomationDefinitionFormValues>({
    defaultValues: {
      name: "Branch test",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "sales.sale.created",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [],
      branchingCanvasAuthoring: true,
      preservedBranchingFlowGraph: graph,
    },
  });
  return (
    <FormProvider {...form}>
      <AutomationBranchingAuthoringPanel
        compatibleActionTypes={["notification.send"]}
        showGraphPreview
      />
    </FormProvider>
  );
}

describe("AutomationBranchingAuthoringPanel", () => {
  it("renders routing timeline (reachable from All fields when branching)", () => {
    render(<Harness />);
    expect(screen.getByText(/Routing timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/When \(conditions/i)).toBeInTheDocument();
  });
});
