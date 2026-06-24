"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  Check,
  Copy,
  Webhook,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppCredentialsFormSchema,
  type AppCredentialsFormValues,
} from "../validation";
import {
  useMetaIntegrationSummary,
  useUpdateAppCredentials,
  useRegenerateWebhookToken,
  useDeleteCredential,
} from "../hooks/use-meta-integration";
import { AddCredentialDialog } from "./AddCredentialDialog";

const GRAPH_API_VERSIONS = [
  "v25.0",
  "v24.0",
  "v23.0",
  "v22.0",
  "v21.0",
  "v20.0",
];

/** Small read-only field with a copy button (for the webhook URL / verify token). */
function CopyField({ value, label }: { value: string; label: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-1.5 font-mono text-xs">
        {value}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy className="mr-1 h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

const MCP_TOOL_GROUPS: Array<{ group: string; tools: string[] }> = [
  {
    group: "Page & posts",
    tools: [
      "meta_page_list",
      "meta_page_get",
      "meta_page_insights",
      "meta_page_feed",
      "meta_page_ratings",
      "meta_page_photos",
      "meta_page_videos",
      "meta_page_roles",
      "meta_post_list",
      "meta_post_get",
      "meta_post_insights",
      "meta_post_reactions",
      "meta_post_comments",
      "meta_comment_replies",
      "meta_video_insights",
    ],
  },
  {
    group: "Inbox / messaging",
    tools: [
      "meta_conversation_list",
      "meta_conversation_get",
      "meta_conversation_messages",
      "meta_message_get",
      "meta_messaging_profile",
      "meta_messaging_insights",
    ],
  },
  {
    group: "Labels",
    tools: [
      "meta_custom_labels_list",
      "meta_user_custom_labels",
      "meta_adlabels_list",
      "meta_adlabel_objects",
    ],
  },
  {
    group: "Ads",
    tools: [
      "meta_ad_accounts_list",
      "meta_ad_account_get",
      "meta_ad_objects_list",
      "meta_campaign_get",
      "meta_adset_get",
      "meta_ad_get",
      "meta_adcreative_get",
      "meta_ads_insights",
      "meta_ads_insights_submit",
      "meta_ads_insights_poll",
      "meta_custom_audiences_list",
      "meta_ad_rules",
      "meta_ad_account_activities",
      "meta_businesses_list",
    ],
  },
  {
    group: "Webhooks & generic",
    tools: [
      "meta_webhook_subscriptions",
      "meta_graph_get",
      "meta_graph_get_all",
      "meta_graph_batch",
    ],
  },
];

export function FacebookIntegrationPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) || "";
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogKind, setAddDialogKind] = useState<"PAGE" | "ADS" | null>(
    null,
  );

  const { data: summary, isLoading } = useMetaIntegrationSummary();
  const updateAppCredentials = useUpdateAppCredentials();
  const regenerateToken = useRegenerateWebhookToken();
  const deleteCredential = useDeleteCredential();

  const form = useForm<AppCredentialsFormValues>({
    resolver: zodResolver(AppCredentialsFormSchema),
    defaultValues: {
      appId: summary?.appId ?? "",
      appSecret: "",
      graphApiVersion: summary?.graphApiVersion ?? "v23.0",
      defaultPageId: summary?.defaultPageId ?? "",
      defaultAdAccountId: summary?.defaultAdAccountId ?? "",
    },
    values: {
      appId: summary?.appId ?? "",
      appSecret: "",
      graphApiVersion: summary?.graphApiVersion ?? "v23.0",
      defaultPageId: summary?.defaultPageId ?? "",
      defaultAdAccountId: summary?.defaultAdAccountId ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {};
    if (values.appId !== undefined) payload.appId = values.appId || null;
    if (values.appSecret) payload.appSecret = values.appSecret;
    if (values.graphApiVersion !== undefined)
      payload.graphApiVersion = values.graphApiVersion || null;
    if (values.defaultPageId !== undefined)
      payload.defaultPageId = values.defaultPageId || null;
    if (values.defaultAdAccountId !== undefined)
      payload.defaultAdAccountId = values.defaultAdAccountId || null;

    await updateAppCredentials.mutateAsync(
      payload as Parameters<typeof updateAppCredentials.mutateAsync>[0],
    );
  });

  const handleOpenAddDialog = (kind: "PAGE" | "ADS") => {
    setAddDialogKind(kind);
    setAddDialogOpen(true);
  };

  const handleDeleteCredential = (id: string) => {
    void deleteCredential.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading integration settings…
      </div>
    );
  }

  const pages = summary?.credentials.filter((c) => c.kind === "PAGE") ?? [];
  const adAccounts = summary?.credentials.filter((c) => c.kind === "ADS") ?? [];
  const webhook = summary?.webhook;

  const isBusy =
    updateAppCredentials.isPending ||
    deleteCredential.isPending ||
    regenerateToken.isPending ||
    form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      {/* App Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle>App credentials</CardTitle>
          <CardDescription>
            Bring your own Facebook App — enter your App ID and App Secret. They
            are encrypted at rest and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-id">App ID</Label>
              <Input
                id="app-id"
                type="text"
                placeholder="Your Facebook App ID"
                autoComplete="off"
                {...form.register("appId")}
              />
              {form.formState.errors.appId && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.appId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-secret">App Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="app-secret"
                  type="password"
                  placeholder={
                    summary?.hasAppSecret
                      ? "Leave blank to keep current secret"
                      : "Your Facebook App Secret"
                  }
                  autoComplete="off"
                  {...form.register("appSecret")}
                />
                {summary?.hasAppSecret && (
                  <div className="flex items-center gap-1 rounded-md bg-green-50 px-3 text-sm text-green-700">
                    <Check className="h-4 w-4" />
                    <span>Configured</span>
                  </div>
                )}
              </div>
              {form.formState.errors.appSecret && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.appSecret.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave blank to keep your current secret. Enter a new value to
                replace it. Used to sign Graph requests and verify inbound
                webhooks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="graph-api-version">Graph API Version</Label>
              <Select
                value={form.watch("graphApiVersion") || "v23.0"}
                onValueChange={(v) =>
                  form.setValue("graphApiVersion", v, { shouldDirty: true })
                }
              >
                <SelectTrigger id="graph-api-version" className="w-full">
                  <SelectValue placeholder="Select a version" />
                </SelectTrigger>
                <SelectContent>
                  {GRAPH_API_VERSIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                      {v === "v23.0" ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The Graph API version used for all calls. Latest is v25.0; v23.0
                is a safe default.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-page-id">
                Default Page ID (optional)
              </Label>
              <Input
                id="default-page-id"
                type="text"
                placeholder="e.g., 12345678901234"
                autoComplete="off"
                {...form.register("defaultPageId")}
              />
              {form.formState.errors.defaultPageId && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.defaultPageId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-ad-account-id">
                Default Ad Account ID (optional)
              </Label>
              <Input
                id="default-ad-account-id"
                type="text"
                placeholder="e.g., 123456789 or act_123456789"
                autoComplete="off"
                {...form.register("defaultAdAccountId")}
              />
              {form.formState.errors.defaultAdAccountId && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.defaultAdAccountId.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Can be with or without the &quot;act_&quot; prefix.
              </p>
            </div>

            <Button type="submit" disabled={isBusy}>
              {updateAppCredentials.isPending
                ? "Saving…"
                : "Save app credentials"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Webhook / Inbox onboarding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Messenger inbox webhook</CardTitle>
              <CardDescription>
                Point your Meta app&apos;s webhook here so inbound messages flow
                into your inbox.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Callback URL</Label>
            <CopyField value={webhook?.url ?? ""} label="Callback URL" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Verify Token</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => regenerateToken.mutate()}
                disabled={isBusy}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
            <CopyField
              value={webhook?.verifyToken ?? ""}
              label="Verify token"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated for you — paste this with the Callback URL in Meta.
              Regenerating invalidates the old one.
            </p>
          </div>
          {webhook?.subscribedFields?.length ? (
            <div className="space-y-1.5">
              <Label>Auto-subscribed fields</Label>
              <div className="flex flex-wrap gap-1.5">
                {webhook.subscribedFields.map((f) => (
                  <Badge key={f} variant="secondary">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Set this up <strong>first</strong>: in your Meta App dashboard →{" "}
              <strong>Webhooks</strong>, choose <strong>Page</strong>, paste the
              Callback URL and Verify Token above, then click Verify &amp; Save.
            </li>
            <li>
              Save your App ID &amp; Secret above (used to sign and verify
              events).
            </li>
            <li>
              <strong>Then</strong> add a Page token below — it auto-subscribes
              the fields above so inbound messages reach your inbox.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Pages Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pages</CardTitle>
              <CardDescription>
                Connected Facebook Pages ({pages.length})
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenAddDialog("PAGE")}
              disabled={isBusy}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No Pages connected yet. Add one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((cred) => (
                <div key={cred.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{cred.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cred.externalId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {cred.webhookSubscribed ? (
                        <Badge className="bg-green-600">
                          Webhook subscribed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-600"
                        >
                          Webhook not subscribed
                        </Badge>
                      )}
                      {cred.inboxStatus && (
                        <Badge variant="secondary">
                          Inbox: {cred.inboxStatus}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCredential(cred.id)}
                        disabled={isBusy}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ad Accounts</CardTitle>
              <CardDescription>
                Connected Meta Ads Accounts ({adAccounts.length})
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenAddDialog("ADS")}
              disabled={isBusy}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {adAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No Ad Accounts connected yet. Add one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {adAccounts.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{cred.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cred.externalId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cred.status === "ACTIVE" ? (
                      <Badge className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">{cred.status}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCredential(cred.id)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Use via AI (MCP) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Use via AI (MCP)</CardTitle>
              <CardDescription>
                Query this Facebook data from any MCP client.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once a Page or Ad account is connected above, all of it is readable
            through your workspace&apos;s existing MCP connection —{" "}
            <strong>any MCP token you&apos;ve already minted works</strong>, no
            separate token needed.{" "}
            {workspace && (
              <Link
                href={`/${workspace}/settings/mcp`}
                className="font-medium underline underline-offset-2"
              >
                Manage MCP tokens →
              </Link>
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {MCP_TOOL_GROUPS.map(({ group, tools }) => (
              <div key={group} className="rounded-lg border p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <div className="flex flex-wrap gap-1">
                  {tools.map((t) => (
                    <code
                      key={t}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                    >
                      {t}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            All read-only. Insights default to current metric names (the
            deprecated page_impressions / page_fans are avoided). Date ranges
            are capped at 90 days; use the async ads tools for heavy reports.
          </p>
        </CardContent>
      </Card>

      <AddCredentialDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        kind={addDialogKind}
      />
    </div>
  );
}
