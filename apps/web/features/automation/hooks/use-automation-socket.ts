"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { automationKeys } from "./use-automation";
import type { AutomationRun } from "../services/automation.service";

interface RunUpdatedPayload {
  runId: string;
  automationId: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  completedAt: string;
}

/**
 * Subscribes to `automation:run:updated` socket events and patches the
 * TanStack Query cache in-place so the RunHistory component updates
 * instantly without a round-trip refetch.
 */
export function useAutomationSocket(automationId: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!automationId) return;

    const socket = acquireSocket();

    const onRunUpdated = (payload: RunUpdatedPayload) => {
      if (payload.automationId !== automationId) return;

      qc.setQueriesData<{ runs: AutomationRun[] }>(
        { queryKey: automationKeys.runs(automationId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            runs: old.runs.map((r) =>
              r.id === payload.runId
                ? {
                    ...r,
                    status: payload.status,
                    completedAt: payload.completedAt,
                  }
                : r,
            ),
          };
        },
      );
    };

    socket.on("automation:run:updated", onRunUpdated);

    return () => {
      socket.off("automation:run:updated", onRunUpdated);
      releaseSocket();
    };
  }, [automationId, qc]);
}
