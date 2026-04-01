import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseWorkflows = vi.fn();
const mockUseWorkflowTemplates = vi.fn();
const mockUsePipelines = vi.fn();
const mockCreateMutate = vi.fn();
const mockInstallTemplateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

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

import WorkflowEditorPage from "./WorkflowEditorPage";

describe("WorkflowEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipelines.mockReturnValue({
      data: { pipelines: [{ id: "p1", name: "Main", stages: [] }] },
    });
    mockUseWorkflowTemplates.mockReturnValue({
      data: {
        templates: [
          {
            templateKey: "new-sales-sales-won-follow-up",
            name: "Sales won follow-up",
            description: "Follow-up automation",
            category: "DEFAULT",
            recommended: true,
            supportedObjects: ["DEAL", "TASK"],
            pipelineType: "NEW_SALES",
            isInstalled: false,
            availablePipelines: [{ id: "p1", name: "Main", type: "NEW_SALES" }],
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

  it("renders template install card", () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    expect(screen.getByText("Sales won follow-up")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /install template/i }),
    ).toBeInTheDocument();
  });
});
