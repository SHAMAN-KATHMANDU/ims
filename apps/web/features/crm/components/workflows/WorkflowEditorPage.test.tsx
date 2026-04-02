import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "test-workspace" }),
}));

const mockUseWorkflows = vi.fn();
const mockUseWorkflowTemplates = vi.fn();
const mockUsePipelines = vi.fn();
const mockCreateMutate = vi.fn();
const mockInstallTemplateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUseEnvFeatureFlag = vi.fn(() => true);

vi.mock("../../hooks/use-workflows", () => ({
  useWorkflows: (...args: unknown[]) => mockUseWorkflows(...args),
  useWorkflowTemplates: (...args: unknown[]) =>
    mockUseWorkflowTemplates(...args),
  useCreateWorkflow: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useInstallWorkflowTemplate: () => ({
    mutate: mockInstallTemplateMutate,
    isPending: false,
  }),
  useUpdateWorkflow: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteWorkflow: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock("../../hooks/use-pipelines", () => ({
  usePipelines: (...args: unknown[]) => mockUsePipelines(...args),
}));

vi.mock("@/features/flags", () => ({
  useEnvFeatureFlag: () => mockUseEnvFeatureFlag(),
}));

import WorkflowEditorPage from "./WorkflowEditorPage";

describe("WorkflowEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvFeatureFlag.mockReturnValue(true);
    mockUsePipelines.mockReturnValue({
      data: { pipelines: [{ id: "p1", name: "Main", stages: [] }] },
    });
    mockUseWorkflowTemplates.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        templates: [
          {
            templateKey: "new-sales-sales-won-follow-up",
            name: "Sales won follow-up",
            description: "Follow-up automation",
            category: "DEFAULT",
            difficulty: "BEGINNER",
            version: 1,
            recommended: true,
            supportedObjects: ["DEAL", "TASK"],
            pipelineType: "NEW_SALES",
            isInstalled: false,
            isOutdated: false,
            installedWorkflowId: null,
            installedWorkflowName: null,
            installedPipelineId: null,
            installedPipelineName: null,
            installedAt: null,
            isActive: false,
            installedCount: 0,
            installState: "AVAILABLE",
            availablePipelines: [{ id: "p1", name: "Main", type: "NEW_SALES" }],
            rulesPreview: [
              {
                trigger: "DEAL_WON",
                triggerStageId: null,
                triggerStageLabel: null,
                action: "CREATE_TASK",
                ruleOrder: 0,
              },
            ],
          },
        ],
      },
    });
  });

  it("renders workflow rows", () => {
    mockUseWorkflows.mockReturnValue({
      data: {
        workflows: [
          {
            id: "wf1",
            tenantId: "t1",
            pipelineId: "p1",
            name: "Auto follow-up",
            isActive: true,
            pipeline: { id: "p1", name: "Main" },
            rules: [],
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    expect(screen.getByText("Auto follow-up")).toBeInTheDocument();
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("opens create workflow dialog", () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    fireEvent.click(screen.getByRole("button", { name: /new workflow/i }));
    expect(
      screen.getByRole("heading", { name: "New Workflow" }),
    ).toBeInTheDocument();
  });

  it("renders template summary and opens browser with install actions", () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    expect(screen.getByText(/\d+ template/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /browse templates/i }));
    expect(
      screen.getByRole("heading", { name: /workflow templates/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales won follow-up")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /install template/i }),
    ).toBeInTheDocument();
  });

  it("opens install dialog and confirms template install", async () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    fireEvent.click(screen.getByRole("button", { name: /browse templates/i }));
    fireEvent.click(screen.getByRole("button", { name: /install template/i }));

    const installDialog = await screen.findByRole("dialog", {
      name: /install workflow template/i,
    });
    expect(installDialog).toBeInTheDocument();

    fireEvent.click(
      within(installDialog).getByRole("button", {
        name: /^install template$/i,
      }),
    );

    await waitFor(() => {
      expect(mockInstallTemplateMutate).toHaveBeenCalledWith(
        {
          templateKey: "new-sales-sales-won-follow-up",
          data: {
            pipelineId: "p1",
            overwriteExisting: false,
            activate: true,
          },
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      );
    });
  }, 15_000);

  it("toggles an installed template workflow from the library card", async () => {
    mockUseWorkflowTemplates.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        templates: [
          {
            templateKey: "new-sales-sales-won-follow-up",
            name: "Sales won follow-up",
            description: "Follow-up automation",
            category: "DEFAULT",
            difficulty: "BEGINNER",
            version: 1,
            recommended: true,
            supportedObjects: ["DEAL", "TASK"],
            pipelineType: "NEW_SALES",
            isInstalled: true,
            isOutdated: false,
            installedWorkflowId: "wf-template",
            installedWorkflowName: "Sales won follow-up",
            installedPipelineId: "p1",
            installedPipelineName: "Main",
            installedAt: null,
            isActive: true,
            installedCount: 1,
            installState: "INSTALLED",
            availablePipelines: [{ id: "p1", name: "Main", type: "NEW_SALES" }],
            rulesPreview: [
              {
                trigger: "DEAL_WON",
                triggerStageId: null,
                triggerStageLabel: null,
                action: "CREATE_TASK",
                ruleOrder: 0,
              },
            ],
          },
        ],
      },
    });
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    fireEvent.click(screen.getByRole("button", { name: /browse templates/i }));
    const deactivate = await screen.findByRole("button", {
      name: /deactivate workflow/i,
    });
    fireEvent.click(deactivate);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: "wf-template",
        data: { isActive: false },
      });
    });
  }, 15_000);

  it("renders workflow onboarding and link to Automation settings", () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);

    expect(screen.getByText(/What pipeline workflows do/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Settings → Automation/i }),
    ).toHaveAttribute("href", "/test-workspace/settings/automation");

    expect(
      screen.getByRole("button", { name: /How to set up workflows/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Templates vs custom workflows/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /When to use Automations instead/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/numbered setup guide/i)).toBeInTheDocument();
  });
});
