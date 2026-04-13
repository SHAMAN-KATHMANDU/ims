import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { WorkflowForm } from "./WorkflowForm";

describe("WorkflowForm", () => {
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits edit form values", async () => {
    const onSubmit = vi.fn();

    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[{ id: "s1", name: "New" }]}
        defaultValues={{ name: "Existing flow", isActive: true, rules: [] }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Updated flow", isActive: true }),
      );
    });
  });

  it("shows rules help text for stage triggers and Any stage", async () => {
    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[]}
        defaultValues={{ name: "Existing flow", isActive: true, rules: [] }}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /help: workflow rules/i }),
    );
    const help = await screen.findByRole("dialog", { name: /workflow rules/i });
    expect(
      within(help).getByText(/require a specific stage unless you choose/),
    ).toBeInTheDocument();

    fireEvent.click(within(help).getByRole("button", { name: /^close$/i }));

    fireEvent.click(screen.getByRole("button", { name: /add rule/i }));
    expect(screen.getByText("Stage entered")).toBeInTheDocument();
    expect(screen.getAllByText("Any stage").length).toBeGreaterThanOrEqual(1);
  });

  it("submits stage enter rule with Any stage (null triggerStageId)", async () => {
    const onSubmit = vi.fn();

    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[{ id: "s1", name: "New" }]}
        defaultValues={{
          name: "Flow",
          isActive: true,
          rules: [
            {
              trigger: "STAGE_ENTER",
              triggerStageId: null,
              action: "CREATE_TASK",
              actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
            },
          ],
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        rules: [
          expect.objectContaining({
            trigger: "STAGE_ENTER",
            triggerStageId: null,
            action: "CREATE_TASK",
          }),
        ],
      }),
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[]}
        defaultValues={{ name: "Existing flow", isActive: true, rules: [] }}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not offer journey type as a writable contact field", () => {
    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[]}
        defaultValues={{
          name: "Existing flow",
          isActive: true,
          rules: [
            {
              trigger: "DEAL_CREATED",
              action: "UPDATE_CONTACT_FIELD",
              actionConfig: { field: "source", value: "" },
            },
          ],
        }}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByText("Journey type")).not.toBeInTheDocument();
  });
});
