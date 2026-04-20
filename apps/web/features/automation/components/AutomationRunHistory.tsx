"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAutomationRuns,
  useReplayAutomationEvent,
} from "../hooks/use-automation";
import { useAutomationSocket } from "../hooks/use-automation-socket";
import type {
  AutomationRun,
  AutomationRunStep,
} from "../services/automation.service";
import {
  describeBranchDecisionLines,
  describeSkippedBranchArmsLines,
  extractGraphBranchDecisions,
} from "../utils/automation-flow-graph-view";

interface RunStatusBadgeProps {
  status: AutomationRun["status"];
}

function RunStatusBadge({ status }: RunStatusBadgeProps): ReactElement {
  const variants = {
    SUCCEEDED: {
      icon: CheckCircle2,
      label: "Succeeded",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    FAILED: {
      icon: XCircle,
      label: "Failed",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    SKIPPED: {
      icon: SkipForward,
      label: "Shadow",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    RUNNING: {
      icon: Loader2,
      label: "Running",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
  } as const;

  const { icon: Icon, label, className } = variants[status];
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-xs font-medium ${className}`}
    >
      <Icon
        className={`h-3 w-3 ${status === "RUNNING" ? "animate-spin" : ""}`}
        aria-hidden
      />
      {label}
    </Badge>
  );
}

function StepStatusIcon({
  status,
}: {
  status: AutomationRunStep["status"];
}): ReactElement {
  if (status === "SUCCEEDED")
    return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />;
  if (status === "FAILED")
    return <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />;
  if (status === "SKIPPED")
    return <SkipForward className="h-4 w-4 text-yellow-600 flex-shrink-0" />;
  return (
    <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
  );
}

function formatDuration(start: string, end?: string | null): string {
  const ms = end
    ? new Date(end).getTime() - new Date(start).getTime()
    : Date.now() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60_000);
  const hrs = Math.floor(delta / 3_600_000);
  const days = Math.floor(delta / 86_400_000);
  if (mins < 1) return "just now";
  if (hrs < 1) return `${mins}m ago`;
  if (days < 1) return `${hrs}h ago`;
  return `${days}d ago`;
}

function RunRow({
  run,
  automationEventId: _automationEventId,
}: {
  run: AutomationRun;
  automationEventId?: string | null;
}): ReactElement {
  const [open, setOpen] = useState(true);
  const replay = useReplayAutomationEvent();

  const canReplay = run.status === "FAILED" && run.automationEventId;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer select-none rounded-lg border bg-card transition-colors">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          <RunStatusBadge status={run.status} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{run.eventName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {run.status.toLowerCase()} · {run.executionMode.toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {run.entityType} · {run.entityId.slice(0, 8)}…
            </p>
          </div>

          <div className="text-right flex-shrink-0 space-y-0.5">
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(run.startedAt)}
            </p>
            {run.completedAt && (
              <p className="text-xs text-muted-foreground">
                {formatDuration(run.startedAt, run.completedAt)}
              </p>
            )}
          </div>

          {canReplay && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              aria-label="Re-run from failed step"
              onClick={(e) => {
                e.stopPropagation();
                if (run.automationEventId) {
                  replay.mutate({
                    eventId: run.automationEventId,
                    payload: { reprocessFromStart: false },
                  });
                }
              }}
              disabled={replay.isPending}
            >
              {replay.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-7 mb-3 space-y-1.5 border-l-2 border-muted pl-4 mt-1">
          {run.runSteps.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No step detail recorded.
            </p>
          ) : (
            run.runSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-2 py-1.5">
                <StepStatusIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">
                    {step.graphNodeId ?? step.automationStepId ?? "Step"}
                  </p>
                  {step.output != null && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {step.status.toLowerCase()} ·{" "}
                      {JSON.stringify(step.output)}
                    </p>
                  )}
                  {step.errorMessage && (
                    <p className="text-xs text-red-600 mt-0.5 break-words">
                      {step.errorMessage}
                    </p>
                  )}
                </div>
                {step.startedAt && (
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDuration(step.startedAt, step.completedAt)}
                  </p>
                )}
              </div>
            ))
          )}

          {run.errorMessage && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 mt-2">
              <p className="text-xs text-red-700 font-medium">Run error</p>
              <p className="text-xs text-red-600 mt-1 break-words">
                {run.errorMessage}
              </p>
            </div>
          )}

          {(() => {
            const decisions = extractGraphBranchDecisions(run.stepOutput);
            if (!decisions) return null;
            const takenLines = describeBranchDecisionLines(
              run.flowGraphSnapshot,
              decisions,
            );
            const skippedLines = describeSkippedBranchArmsLines(
              run.flowGraphSnapshot,
              decisions,
            );
            return (
              <>
                {takenLines.length > 0 && (
                  <div
                    data-testid={`automation-run-branch-path-${run.id}`}
                    className="mt-2 space-y-0.5"
                  >
                    {takenLines.map((line) => (
                      <p key={line} className="text-xs text-green-700">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {skippedLines.length > 0 && (
                  <div
                    data-testid={`automation-run-skipped-branches-${run.id}`}
                    className="mt-1 space-y-0.5"
                  >
                    {skippedLines.map((line) => (
                      <p key={line} className="text-xs text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface AutomationRunHistoryProps {
  automationId: string;
  limit?: number;
}

export function AutomationRunHistory({
  automationId,
  limit = 25,
}: AutomationRunHistoryProps): ReactElement {
  useAutomationSocket(automationId);

  const { data, isLoading, isError } = useAutomationRuns(automationId, {
    limit,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Failed to load run history.</p>
    );
  }

  const runs = data?.runs ?? [];

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No runs yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          This automation hasn&apos;t fired since it was created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
    </div>
  );
}
