"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTestAutomationDefinition } from "../hooks/use-automation";

interface AutomationTestPanelProps {
  automationId: string;
  /** Pre-populate the event name from the automation's first trigger. */
  defaultEventName?: string;
}

export function AutomationTestPanel({
  automationId,
  defaultEventName = "",
}: AutomationTestPanelProps): ReactElement {
  const [eventName, setEventName] = useState(defaultEventName);
  const [payloadJson, setPayloadJson] = useState("{\n  \n}");
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);

  const test = useTestAutomationDefinition();

  const handleRun = () => {
    let payload: Record<string, unknown> = {};
    try {
      const trimmed = payloadJson.trim();
      if (trimmed && trimmed !== "{}") {
        payload = JSON.parse(trimmed) as Record<string, unknown>;
      }
      setParseError(null);
    } catch {
      setParseError("Invalid JSON — fix the payload before running.");
      return;
    }

    test.mutate(
      { id: automationId, input: { eventName: eventName.trim(), payload } },
      {
        onSuccess: (result) => {
          if (result.runId) setLastRunId(result.runId);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Test automation</CardTitle>
        <CardDescription className="text-xs">
          Fire a synthetic event in <strong>shadow mode</strong> — actions run
          but are labelled as test runs and won&apos;t affect live data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="test-event-name" className="text-xs">
            Event name
          </Label>
          <Input
            id="test-event-name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. crm.lead.created"
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="test-payload" className="text-xs">
            Payload (JSON)
          </Label>
          <Textarea
            id="test-payload"
            value={payloadJson}
            onChange={(e) => {
              setPayloadJson(e.target.value);
              setParseError(null);
            }}
            rows={6}
            className="font-mono text-xs resize-none"
            spellCheck={false}
          />
          {parseError && (
            <p className="text-xs text-destructive">{parseError}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!eventName.trim() || test.isPending}
          >
            {test.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-2 h-3.5 w-3.5" />
            )}
            Run test
          </Button>
          {lastRunId && (
            <p className="text-xs text-muted-foreground">
              Run started · ID:{" "}
              <code className="font-mono">{lastRunId.slice(0, 8)}…</code>— see
              run history below.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
