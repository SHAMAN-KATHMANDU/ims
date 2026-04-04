import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "test-workspace" }),
}));

vi.mock("@/features/flags", () => ({
  EnvFeature: { AUTOMATION_BRANCHING: "AUTOMATION_BRANCHING" },
  useEnvFeatureFlag: () => false,
}));

const mockUseAutomationDefinitions = vi.fn();
const mockUseAutomationRuns = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockArchiveMutate = vi.fn();
const mockReplayMutate = vi.fn();

vi.mock("../hooks/use-automation", () => ({
  useAutomationDefinitions: (...args: unknown[]) =>
    mockUseAutomationDefinitions(...args),
  useAutomationRuns: (...args: unknown[]) => mockUseAutomationRuns(...args),
  useCreateAutomationDefinition: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateAutomationDefinition: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useArchiveAutomationDefinition: () => ({
    mutate: mockArchiveMutate,
    isPending: false,
  }),
  useReplayAutomationEvent: () => ({
    mutate: mockReplayMutate,
    isPending: false,
  }),
}));

vi.mock("./AutomationForm", () => ({
  AutomationForm: ({
    defaultValues,
    onSubmit,
    onCancel,
  }: {
    defaultValues?: { name?: string } | undefined;
    onSubmit: (values: unknown) => void;
    onCancel?: () => void;
  }) => (
    <div>
      <p>
        {defaultValues?.name ? `editing:${defaultValues.name}` : "creating:new"}
      </p>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            name: defaultValues?.name ?? "Fresh automation",
            description: "",
            scopeType: "GLOBAL",
            scopeId: "",
            status: "ACTIVE",
            executionMode: "LIVE",
            suppressLegacyWorkflows: true,
            triggers: [
              {
                eventName: "crm.deal.created",
                conditions: [],
                delayMinutes: 0,
              },
            ],
            steps: [
              {
                actionType: "workitem.create",
                actionConfig: {
                  title: "Follow up",
                  type: "TASK",
                  priority: "MEDIUM",
                },
                continueOnError: false,
              },
            ],
          })
        }
      >
        Submit form
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel}>
          Cancel form
        </button>
      ) : null}
    </div>
  ),
}));

import { AutomationBuilderPage } from "./AutomationBuilderPage";

describe("AutomationBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAutomationDefinitions.mockReturnValue({
      data: {
        automations: [
          {
            id: "auto-1",
            name: "Deal follow-up",
            description: null,
            scopeType: "CRM_PIPELINE",
            scopeId: "pipeline-1",
            status: "ACTIVE",
            executionMode: "SHADOW",
            suppressLegacyWorkflows: true,
            triggers: [
              {
                id: "trigger-1",
                eventName: "crm.deal.created",
                delayMinutes: 0,
              },
            ],
            steps: [
              {
                id: "step-1",
                actionType: "workitem.create",
                actionConfig: { title: "Follow up" },
                continueOnError: false,
              },
            ],
          },
        ],
      },
      isLoading: false,
    });
    mockUseAutomationRuns.mockReturnValue({
      data: {
        runs: [
          {
            id: "run-1",
            eventName: "crm.deal.created",
            status: "FAILED",
            executionMode: "SHADOW",
            entityType: "DEAL",
            entityId: "deal-1",
            errorMessage: "Webhook timed out",
            runSteps: [
              {
                id: "run-step-1",
                status: "SKIPPED",
                output: { preview: "shadow payload" },
              },
            ],
          },
        ],
      },
    });
  });

  it("creates a new automation from the form payload", () => {
    render(<AutomationBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: /create automation/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit form/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Fresh automation",
        scopeId: null,
        suppressLegacyWorkflows: true,
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("supports edit and archive flows for listed automations", async () => {
    render(<AutomationBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText("editing:Deal follow-up")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submit form/i }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        id: "auto-1",
        payload: expect.objectContaining({
          name: "Deal follow-up",
          scopeId: null,
        }),
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /archive/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^archive$/i }));
    expect(mockArchiveMutate).toHaveBeenCalledWith("auto-1");
  });

  it("renders legacy suppression details and recent run output", () => {
    render(<AutomationBuilderPage />);

    expect(
      screen.getByText(/suppresses matching legacy crm workflows/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/failed · shadow/i)).toBeInTheDocument();
    expect(screen.getByText("Webhook timed out")).toBeInTheDocument();
    expect(
      screen.getByText(/skipped · \{"preview":"shadow payload"\}/i),
    ).toBeInTheDocument();
  });

  it("renders branch decisions using flowGraphSnapshot for node labels (AT-UI-003)", () => {
    const ifNodeId = "00000000-0000-4000-8000-000000000021";
    const noopThen = "00000000-0000-4000-8000-000000000022";
    const noopElse = "00000000-0000-4000-8000-000000000023";
    mockUseAutomationRuns.mockReturnValue({
      data: {
        runs: [
          {
            id: "run-branch",
            eventName: "crm.deal.created",
            status: "SUCCEEDED",
            executionMode: "SHADOW",
            entityType: "DEAL",
            entityId: "deal-1",
            stepOutput: {
              __automationGraph: {
                branchDecisions: { [ifNodeId]: "true" },
              },
            },
            flowGraphSnapshot: {
              nodes: [
                {
                  id: ifNodeId,
                  kind: "if",
                  config: {
                    conditions: [
                      { path: "total", operator: "gte", value: 1000 },
                    ],
                  },
                },
                { id: noopThen, kind: "noop" },
                { id: noopElse, kind: "noop" },
              ],
              edges: [
                {
                  fromNodeId: ifNodeId,
                  toNodeId: noopThen,
                  edgeKey: "true",
                },
                {
                  fromNodeId: ifNodeId,
                  toNodeId: noopElse,
                  edgeKey: "false",
                },
              ],
            },
            runSteps: [],
          },
        ],
      },
    });

    render(<AutomationBuilderPage />);

    expect(
      screen.getByTestId("automation-run-branch-path-run-branch"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If → Then \(conditions met\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("automation-run-skipped-branches-run-branch"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If → not taken: Else \(conditions not met\)/i),
    ).toBeInTheDocument();
  });

  it("opens automation templates dialog with descriptions and apply actions", () => {
    render(<AutomationBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: /^templates$/i }));

    expect(
      screen.getByRole("heading", { name: /automation templates/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales follow-up")).toBeInTheDocument();
    expect(screen.getByText("Inventory restock")).toBeInTheDocument();
    expect(screen.getByText("Lead routing")).toBeInTheDocument();
    expect(screen.getByText("New deal checklist")).toBeInTheDocument();
    expect(screen.getByText("Stock threshold alert")).toBeInTheDocument();
    expect(screen.getAllByText("When it runs").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByRole("button", { name: /use this template/i }).length,
    ).toBe(5);
  });

  it("loads chosen template into the editor form and closes the dialog", () => {
    render(<AutomationBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: /^templates$/i }));
    const leadCard = screen.getByTestId("automation-template-lead-routing");
    fireEvent.click(
      within(leadCard).getByRole("button", {
        name: /use this template/i,
      }),
    );

    expect(
      screen.queryByRole("heading", { name: /automation templates/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("editing:Lead conversion routing"),
    ).toBeInTheDocument();
  });

  it("renders onboarding guide with SHADOW and pipeline workflow cues", async () => {
    render(<AutomationBuilderPage />);

    const onboardingAlert = screen.getByRole("alert");
    expect(onboardingAlert.textContent).toMatch(/Event automations/);
    expect(within(onboardingAlert).getByText(/SHADOW/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Settings → Deal pipeline rules/i }),
    ).toHaveAttribute("href", "/test-workspace/settings/crm/workflows");

    fireEvent.click(screen.getByRole("button", { name: /^templates$/i }));
    const templatesDialog = screen.getByRole("dialog", {
      name: /automation templates/i,
    });
    expect(screen.getAllByText("When it runs").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("What it does").length).toBeGreaterThanOrEqual(
      1,
    );
    const templatesFooter = templatesDialog.querySelector(
      '[data-slot="dialog-footer"]',
    );
    expect(templatesFooter).toBeTruthy();
    fireEvent.click(
      within(templatesFooter as HTMLElement).getByRole("button", {
        name: /^close$/i,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /^learn more$/i }));
    const guide = await screen.findByRole("dialog", {
      name: /automation guide/i,
    });
    expect(
      within(guide).getByRole("button", { name: /How automations work/i }),
    ).toBeInTheDocument();
    expect(
      within(guide).getByRole("button", { name: /Setup checklist/i }),
    ).toBeInTheDocument();
    expect(
      within(guide).getByRole("button", {
        name: /Pipeline workflows vs automations/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(guide).getByRole("button", {
        name: /Inventory, low stock, and locations/i,
      }),
    ).toBeInTheDocument();
  });
});
