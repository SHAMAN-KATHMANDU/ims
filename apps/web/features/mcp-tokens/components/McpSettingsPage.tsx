"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { IssueMcpTokenDialog } from "./IssueMcpTokenDialog";
import { McpTokenList } from "./McpTokenList";
import { McpSetupInstructions } from "./McpSetupInstructions";

export function McpSettingsPage() {
  const [issueOpen, setIssueOpen] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP"
        description="Generate access tokens and connect Claude Desktop or any other MCP client to this workspace."
        actions={
          <Button onClick={() => setIssueOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Generate token
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Setup instructions</CardTitle>
          <CardDescription>
            The server URL and token below are everything an MCP client needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <McpSetupInstructions freshToken={freshToken} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your tokens</CardTitle>
          <CardDescription>
            Revoke any token to immediately cut off the client using it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <McpTokenList />
        </CardContent>
      </Card>

      <IssueMcpTokenDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onIssued={(issued) => setFreshToken(issued.token)}
      />
    </div>
  );
}
