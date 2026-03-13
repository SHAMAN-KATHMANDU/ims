import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockLogin = vi.fn();
const mockGetOrgNameBySlug = vi.fn();

vi.mock("../hooks/use-auth", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock("../services/auth.service", () => ({
  getOrgNameBySlug: (...args: unknown[]) => mockGetOrgNameBySlug(...args),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgNameBySlug.mockResolvedValue(null);
  });

  it("renders username and password fields", () => {
    render(<LoginForm tenantSlug="acme" />, { wrapper });

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^login$/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    render(<LoginForm tenantSlug="acme" />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("calls login with credentials on valid submit", async () => {
    mockLogin.mockResolvedValue(undefined);

    render(<LoginForm tenantSlug="acme" />, { wrapper });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "user1" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: "user1",
        password: "password123",
        tenantSlug: "acme",
      });
    });
  });

  it("shows submit error when login throws", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginForm tenantSlug="acme" />, { wrapper });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "user1" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("shows org name in title when slug resolves to org", async () => {
    mockGetOrgNameBySlug.mockResolvedValue("Acme Corp");

    render(<LoginForm tenantSlug="acme" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Sign in to Acme Corp")).toBeInTheDocument();
    });
  });

  it("shows org not found message when slug is empty", async () => {
    render(<LoginForm tenantSlug="" />, { wrapper });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "user1" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid organization url/i)).toBeInTheDocument();
    });
  });
});
