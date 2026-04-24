import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockToast = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockChangeMyPassword = vi.fn();
vi.mock("@/features/auth/services/auth.service", async () => {
  // Preserve a real ChangeMyPasswordError shape so `instanceof` checks hold.
  class ChangeMyPasswordError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ChangeMyPasswordError";
      this.status = status;
    }
  }
  return {
    ChangeMyPasswordError,
    changeMyPassword: (...args: unknown[]) => mockChangeMyPassword(...args),
  };
});

// ── Imports after mocks ──────────────────────────────────────────────────────

import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ChangeMyPasswordError } from "@/features/auth/services/auth.service";

function renderDialog(onOpenChange: (next: boolean) => void = vi.fn()) {
  const utils = render(
    <QueryClientWrapper>
      <ChangePasswordDialog open={true} onOpenChange={onOpenChange} />
    </QueryClientWrapper>,
  );
  return { ...utils, onOpenChange };
}

function fillForm(current: string, next: string, confirm: string) {
  fireEvent.change(
    screen.getByLabelText(/^current password$/i, { selector: "input" }),
    {
      target: { value: current },
    },
  );
  fireEvent.change(
    screen.getByLabelText(/^new password$/i, { selector: "input" }),
    {
      target: { value: next },
    },
  );
  fireEvent.change(
    screen.getByLabelText(/^confirm new password$/i, { selector: "input" }),
    {
      target: { value: confirm },
    },
  );
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /update password/i }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ChangePasswordDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeMyPassword.mockReset();
  });

  it("shows a min-length error for new passwords under 8 characters", async () => {
    renderDialog();
    fillForm("old", "short", "short");
    clickSubmit();

    await waitFor(() =>
      expect(screen.getByRole("alert", { name: undefined })).toBeDefined(),
    );
    const alerts = screen.getAllByRole("alert").map((el) => el.textContent);
    expect(alerts.some((t) => /at least 8/i.test(t ?? ""))).toBe(true);
    expect(mockChangeMyPassword).not.toHaveBeenCalled();
  });

  it("shows a mismatch error when confirm does not equal new password", async () => {
    renderDialog();
    fillForm("old", "longenoughpass1!", "different1!");
    clickSubmit();

    expect(
      await screen.findByText(/passwords do not match/i),
    ).toBeInTheDocument();
    expect(mockChangeMyPassword).not.toHaveBeenCalled();
  });

  it("submits the correct payload to the mutation on success and closes", async () => {
    mockChangeMyPassword.mockImplementation(async () => ({
      message: "Password changed successfully",
      user: { id: "u1", username: "user", tenantId: "t1" },
    }));
    const { onOpenChange } = renderDialog();

    fillForm("oldPass1!", "newPass123!", "newPass123!");
    clickSubmit();

    await waitFor(
      () => {
        expect(mockChangeMyPassword).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // TanStack Query passes the mutation variables as the first arg and a
    // context object (client, meta, mutationKey) as the second.
    expect(mockChangeMyPassword).toHaveBeenCalledWith(
      {
        currentPassword: "oldPass1!",
        newPassword: "newPass123!",
      },
      expect.anything(),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({ title: "Password updated" }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("renders a 401 as a field error on currentPassword", async () => {
    mockChangeMyPassword.mockRejectedValueOnce(
      new ChangeMyPasswordError("Current password is incorrect", 401),
    );
    renderDialog();

    fillForm("wrongPass", "newPass123!", "newPass123!");
    clickSubmit();

    expect(
      await screen.findByText(/current password is incorrect/i),
    ).toBeInTheDocument();
    // No toast on 401 — we use an inline field error.
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("disables the submit button while the mutation is pending", async () => {
    let resolveMutation: (value: unknown) => void = () => {};
    mockChangeMyPassword.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );
    renderDialog();

    fillForm("oldPass1!", "newPass123!", "newPass123!");
    clickSubmit();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /updating/i })).toBeDisabled();
    });

    // Resolve so React Query doesn't leave the hook pending.
    await act(async () => {
      resolveMutation({
        message: "ok",
        user: { id: "u1", username: "user", tenantId: "t1" },
      });
    });
  });

  it("shows the rate-limit toast on a 429 response", async () => {
    mockChangeMyPassword.mockRejectedValueOnce(
      new ChangeMyPasswordError("Too many attempts", 429),
    );
    renderDialog();

    fillForm("oldPass1!", "newPass123!", "newPass123!");
    clickSubmit();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Too many attempts",
          description: "Try again in 15 minutes.",
          variant: "destructive",
        }),
      ),
    );
  });

  it("toggles password visibility when the eye button is clicked", () => {
    renderDialog();

    const input = screen.getByLabelText(/^current password$/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(
      screen.getByRole("button", { name: /show current password/i }),
    );
    expect(input.type).toBe("text");

    fireEvent.click(
      screen.getByRole("button", { name: /hide current password/i }),
    );
    expect(input.type).toBe("password");
  });
});
