import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "test-workspace" }),
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

  it("shows template shortcuts for common automation starters", () => {
    render(<AutomationBuilderPage />);

    expect(screen.getByText("Sales follow-up")).toBeInTheDocument();
    expect(screen.getByText("Inventory restock")).toBeInTheDocument();
    expect(screen.getByText("Lead routing")).toBeInTheDocument();
  });

  it("renders onboarding guide with SHADOW and pipeline workflow cues", () => {
    render(<AutomationBuilderPage />);

    expect(screen.getByText(/What automations do/i)).toBeInTheDocument();
    const onboardingAlert = screen.getByRole("alert");
    expect(within(onboardingAlert).getByText(/SHADOW/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Settings → CRM → Workflows/i }),
    ).toHaveAttribute("href", "/test-workspace/settings/crm/workflows");

    expect(
      screen.getByRole("button", { name: /How automations work/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Setup checklist/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Pipeline workflows vs automations/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("When it runs").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("What it does").length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
