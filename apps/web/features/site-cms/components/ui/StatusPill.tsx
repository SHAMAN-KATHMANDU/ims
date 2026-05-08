"use client";

import type { JSX } from "react";
import { Pill } from "./Pill";

type StatusValue =
  | "published"
  | "draft"
  | "review"
  | "scheduled"
  | "active"
  | "pending"
  | "paused"
  | "ended"
  | "live"
  | "connected"
  | "verifying"
  | "redirecting";

interface StatusInfo {
  tone: "default" | "success" | "warn" | "danger" | "info" | "accent" | "ghost";
  label: string;
}

interface StatusPillProps {
  status: StatusValue;
}

const statusMap: Record<StatusValue, StatusInfo> = {
  published: { tone: "success", label: "Published" },
  draft: { tone: "ghost", label: "Draft" },
  review: { tone: "warn", label: "In review" },
  scheduled: { tone: "info", label: "Scheduled" },
  active: { tone: "success", label: "Active" },
  pending: { tone: "warn", label: "Pending" },
  paused: { tone: "ghost", label: "Paused" },
  ended: { tone: "ghost", label: "Ended" },
  live: { tone: "success", label: "Live" },
  connected: { tone: "success", label: "Connected" },
  verifying: { tone: "warn", label: "Verifying" },
  redirecting: { tone: "info", label: "Redirecting" },
};

export function StatusPill({ status }: StatusPillProps): JSX.Element {
  const info = statusMap[status] || { tone: "ghost", label: status };

  return <Pill tone={info.tone}>{info.label}</Pill>;
}
