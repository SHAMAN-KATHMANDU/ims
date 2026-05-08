import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders published status", () => {
    render(<StatusPill status="published" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("renders draft status", () => {
    render(<StatusPill status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders review status", () => {
    render(<StatusPill status="review" />);
    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("renders scheduled status", () => {
    render(<StatusPill status="scheduled" />);
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("renders active status", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders connected status", () => {
    render(<StatusPill status="connected" />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders verifying status", () => {
    render(<StatusPill status="verifying" />);
    expect(screen.getByText("Verifying")).toBeInTheDocument();
  });

  it("renders redirecting status", () => {
    render(<StatusPill status="redirecting" />);
    expect(screen.getByText("Redirecting")).toBeInTheDocument();
  });
});
