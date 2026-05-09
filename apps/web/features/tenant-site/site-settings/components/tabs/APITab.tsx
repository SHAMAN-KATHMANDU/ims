"use client";

import { Plus, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";

const API_TOKENS = [
  {
    id: "t1",
    name: "Production read",
    token: "sk_live_••••••••••3a92",
    scope: "read",
    used: "12 min ago",
  },
  {
    id: "t2",
    name: "Webhook signing",
    token: "whsec_••••••••••f01b",
    scope: "sign",
    used: "1 hr ago",
  },
  {
    id: "t3",
    name: "CI deploy bot",
    token: "sk_live_••••••••••8c11",
    scope: "write",
    used: "3 days ago",
  },
];

const WEBHOOKS = [
  {
    id: "w1",
    url: "https://hooks.zapier.com/h/4f81/…",
    events: "form.submitted, post.published",
  },
  {
    id: "w2",
    url: "https://api.lumenandcoal.com/site-hook",
    events: "*",
  },
];

export function APITab() {
  const { toast } = useToast();

  const handleCopyToken = (token: string) => {
    toast({ title: "Token copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">API tokens</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New token
          </Button>
        </div>

        <div className="space-y-2">
          {API_TOKENS.map((token) => (
            <div
              key={token.id}
              className="grid grid-cols-[1.2fr_1.4fr_80px_100px_32px] gap-3 items-center py-2 px-3 rounded border hover:bg-muted/30 transition-colors text-sm"
            >
              <span className="font-medium">{token.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {token.token}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-muted">
                {token.scope}
              </span>
              <span className="text-xs text-muted-foreground font-mono text-right">
                {token.used}
              </span>
              <button
                onClick={() => handleCopyToken(token.token)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Webhooks</h3>
        <div className="space-y-3">
          {WEBHOOKS.map((webhook) => (
            <div key={webhook.id} className="p-3 border rounded space-y-1">
              <div className="text-xs text-muted-foreground font-mono break-all">
                {webhook.url}
              </div>
              <div className="text-xs text-muted-foreground">
                {webhook.events}
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add webhook
        </Button>
      </Card>
    </div>
  );
}
