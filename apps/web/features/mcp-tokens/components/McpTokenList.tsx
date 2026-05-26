"use client";

import { Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import {
  useMcpTokens,
  useRevokeMcpToken,
} from "../hooks/use-mcp-tokens";
import type { McpToken } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusLabel(token: McpToken): { label: string; tone: string } {
  if (token.revokedAt) {
    return { label: "Revoked", tone: "text-destructive" };
  }
  if (new Date(token.expiresAt).getTime() <= Date.now()) {
    return { label: "Expired", tone: "text-muted-foreground" };
  }
  return { label: "Active", tone: "text-emerald-500" };
}

export function McpTokenList() {
  const { data: tokens, isLoading } = useMcpTokens();
  const revoke = useRevokeMcpToken();
  const { toast } = useToast();

  const handleRevoke = (token: McpToken) => {
    if (
      !window.confirm(
        `Revoke "${token.name}"? Any MCP client using it will stop working immediately.`,
      )
    ) {
      return;
    }
    revoke.mutate(token.id, {
      onSuccess: () => toast({ title: "MCP token revoked" }),
      onError: (error) =>
        toast({
          title: "Revoke failed",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        }),
    });
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading tokens…</div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
        <Key
          size={20}
          className="mx-auto mb-2 text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">
          You haven&apos;t generated any MCP tokens yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Last used</th>
            <th className="px-3 py-2 font-medium">Expires</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const status = statusLabel(token);
            const isRevoked = !!token.revokedAt;
            return (
              <tr key={token.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{token.name}</td>
                <td className={`px-3 py-2 text-xs ${status.tone}`}>
                  {status.label}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDate(token.createdAt)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDate(token.lastUsedAt)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDate(token.expiresAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(token)}
                    disabled={isRevoked || revoke.isPending}
                    aria-label="Revoke token"
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
