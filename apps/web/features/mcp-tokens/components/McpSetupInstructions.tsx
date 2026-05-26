"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiBaseUrl, appEnv } from "@/config/env";
import { useToast } from "@/hooks/useToast";

const ENV_LABEL: Record<string, string> = {
  development: "Local dev",
  staging: "Staging",
  "staging-production": "Staging-Production",
  production: "Production",
};

const TOOLS_AVAILABLE = [
  ["list_products", "Search products by name or IMS code"],
  ["list_contacts", "Search CRM contacts"],
  ["sales_summary", "Aggregate sales by date range / location"],
  ["list_deals", "List open / won / lost deals by pipeline stage"],
  ["inventory_levels", "Stock per location for a product"],
  ["create_sale", "Record a POS sale with items, discounts and payments"],
] as const;

interface Props {
  /** The token returned from /mcp/tokens, shown only this session. */
  freshToken: string | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy manually.",
        variant: "destructive",
      });
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </Button>
  );
}

export function McpSetupInstructions({ freshToken }: Props) {
  const mcpUrl = `${apiBaseUrl.replace(/\/$/, "")}/mcp`;
  const envLabel = ENV_LABEL[appEnv] ?? appEnv;

  const tokenPlaceholder = "<paste-the-token-you-just-generated>";
  const tokenInSnippet = freshToken ?? tokenPlaceholder;

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        projectx: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpUrl,
            "--header",
            `Authorization: Bearer ${tokenInSnippet}`,
          ],
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p>
          You&apos;re connected to{" "}
          <span className="font-medium">{envLabel}</span>. Tokens generated
          here only work against this environment. To set up Claude Desktop
          (or another MCP client) against another environment, log into that
          environment&apos;s web app and generate a token there.
        </p>
      </div>

      {/* Step 1 — server URL */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">1. Server URL</h3>
        <div className="flex items-stretch gap-2">
          <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono break-all">
            {mcpUrl}
          </code>
          <CopyButton value={mcpUrl} label="Copy server URL" />
        </div>
      </section>

      {/* Step 2 — token */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">2. Access token</h3>
        {freshToken ? (
          <div className="space-y-2">
            <div className="flex items-stretch gap-2">
              <code className="flex-1 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-mono break-all">
                {freshToken}
              </code>
              <CopyButton value={freshToken} label="Copy token" />
            </div>
            <p className="text-xs text-muted-foreground">
              Shown once. After leaving this page you&apos;ll need to
              generate a new token to recover it.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium">Generate token</span> above to
            create one. The snippet below will be updated with the new
            token in place.
          </p>
        )}
      </section>

      {/* Step 3 — Claude Desktop config */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          3. Paste into Claude Desktop
        </h3>
        <p className="text-xs text-muted-foreground">
          On macOS, edit{" "}
          <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
          . Add or merge the <code>mcpServers</code> entry below, then fully
          quit and reopen Claude Desktop. The <code>mcp-remote</code> bridge
          runs locally and proxies requests to this server.
        </p>
        <div className="flex items-start gap-2">
          <pre className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono overflow-x-auto">
            {claudeConfig}
          </pre>
          <CopyButton
            value={claudeConfig}
            label="Copy Claude Desktop config"
          />
        </div>
      </section>

      {/* Step 4 — tools */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          4. What can the MCP do? ({TOOLS_AVAILABLE.length} tools)
        </h3>
        <ul className="space-y-1 text-xs">
          {TOOLS_AVAILABLE.map(([name, description]) => (
            <li key={name} className="flex gap-2">
              <code className="text-muted-foreground">{name}</code>
              <span className="text-muted-foreground">— {description}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Every call runs as your user, scoped to this tenant. Permissions
          and tenant isolation match what the web app enforces.
        </p>
      </section>
    </div>
  );
}
