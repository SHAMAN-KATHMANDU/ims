"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { useCreateMcpToken } from "../hooks/use-mcp-tokens";
import {
  CreateMcpTokenSchema,
  type CreateMcpTokenInput,
} from "../validation";
import type { IssuedMcpToken } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired with the issued token so the parent can render setup instructions. */
  onIssued?: (token: IssuedMcpToken) => void;
}

export function IssueMcpTokenDialog({ open, onOpenChange, onIssued }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateMcpToken();
  const [issued, setIssued] = useState<IssuedMcpToken | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateMcpTokenInput>({
    resolver: zodResolver(CreateMcpTokenSchema),
    mode: "onBlur",
    defaultValues: { name: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createMutation.mutateAsync({ name: values.name });
      setIssued(result);
      onIssued?.(result);
    } catch (error) {
      toast({
        title: "Failed to issue MCP token",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleCopy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the token manually.",
        variant: "destructive",
      });
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setIssued(null);
      setCopied(false);
      form.reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {!issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate MCP token</DialogTitle>
              <DialogDescription>
                Tokens are scoped to your user, your current tenant, and the
                current environment. Give it a name you&apos;ll recognise so
                you can revoke it later.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="mcp-token-name">Name</Label>
                <Input
                  id="mcp-token-name"
                  placeholder="e.g. Claude Desktop — laptop"
                  autoFocus
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Generating…" : "Generate token"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy this token now</DialogTitle>
              <DialogDescription>
                This is the only time you&apos;ll see the full token. Store it
                somewhere safe — we only keep its metadata.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-stretch gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono break-all">
                  {issued.token}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy token"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste it as <code>Authorization: Bearer …</code> when
                connecting your MCP client. The setup instructions on this
                page have been updated with the token.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
