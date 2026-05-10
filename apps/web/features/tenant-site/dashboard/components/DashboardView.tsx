"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useTopbarActionsStore,
  selectTopbarActionsSetActions,
} from "@/store/topbar-actions-store";
import { useAuthStore, selectUsername } from "@/store/auth-store";
import { useRecentEdits } from "../../hooks/use-recent-edits";
import { useDomains } from "../../hooks/use-domains";
import { useTeamMembers } from "../../hooks/use-team-members";
import { useAnalyticsOverview } from "../../hooks/use-analytics";

interface RecentEntry {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string | null;
  kind: "page" | "post";
  href: string;
}
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Plus, ArrowRight } from "lucide-react";
import { StatCard } from "./StatCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { TeamAvatars } from "./TeamAvatars";

export function DashboardView() {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const setActions = useTopbarActionsStore(selectTopbarActionsSetActions);
  const username = useAuthStore(selectUsername);

  const {
    recentPages,
    recentPosts,
    isLoading: recentLoading,
  } = useRecentEdits(10);
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { data: teamMembers, isLoading: teamLoading } = useTeamMembers();
  const { data: analytics } = useAnalyticsOverview();

  const primaryDomain = domains?.[0];

  // Merge pages + posts into a unified, freshness-sorted list for "Recently edited".
  const recentEntries = useMemo<RecentEntry[]>(() => {
    const pages: RecentEntry[] = recentPages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt ?? null,
      kind: "page",
      href: `/${workspace}/site/builder/${p.id}`,
    }));
    const posts: RecentEntry[] = recentPosts.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      isPublished: b.isPublished,
      updatedAt: b.updatedAt ?? null,
      kind: "post",
      href: `/${workspace}/site/post/${b.id}`,
    }));
    return [...pages, ...posts]
      .sort((a, b) => {
        const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return tb - ta;
      })
      .slice(0, 5);
  }, [recentPages, recentPosts, workspace]);

  // Pipeline buckets are derived from the same lists. Pages and posts both
  // expose isPublished + scheduledPublishAt; "In review" isn't tracked yet
  // (would need a workflow status enum), so it stays as "—".
  const pipeline = useMemo(() => {
    const all: Array<{
      isPublished: boolean;
      scheduledPublishAt: string | null;
    }> = [
      ...recentPages.map((p) => ({
        isPublished: p.isPublished,
        scheduledPublishAt: p.scheduledPublishAt,
      })),
      ...recentPosts.map((b) => ({
        isPublished: b.isPublished,
        scheduledPublishAt: b.scheduledPublishAt,
      })),
    ];
    let drafts = 0;
    let scheduled = 0;
    let live = 0;
    for (const item of all) {
      if (item.isPublished) live += 1;
      else if (item.scheduledPublishAt) scheduled += 1;
      else drafts += 1;
    }
    return { drafts, scheduled, live };
  }, [recentPages, recentPosts]);

  useEffect(() => {
    const primaryUrl = primaryDomain?.hostname
      ? `https://${primaryDomain.hostname}`
      : "#";
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild disabled={!primaryDomain}>
          <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Live site
          </a>
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (workspace) {
              router.push(`/${workspace}/site/pages?new=1`);
            }
          }}
        >
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions, workspace, primaryDomain, router]);

  const greeting = username ? username.split(" ")[0] : "Welcome";
  const siteName = primaryDomain?.hostname ?? "your site";

  const stats = [
    {
      label: "Visitors · 7d",
      value: analytics?.totalRevenue
        ? `${Math.floor(analytics.totalRevenue / 1000)}k`
        : "—",
      delta: "+12.4%",
      tone: "success" as const,
      sparkline: [12, 18, 15, 22, 20, 28, 32, 35, 33, 38, 42, 45, 48, 52],
    },
    {
      label: "Avg. session",
      value: analytics?.averageOrderValue
        ? `$${Math.round(analytics.averageOrderValue)}`
        : "—",
      delta: "+6%",
      tone: "success" as const,
      sparkline: [22, 21, 24, 26, 25, 27, 28, 29, 30, 28, 30, 31, 32, 33],
    },
    {
      label: "Conversions",
      value: analytics?.conversionRate
        ? `${Math.round(analytics.conversionRate * 100)}%`
        : "—",
      delta: "+2.1%",
      tone: "success" as const,
      sparkline: [4, 6, 5, 8, 7, 10, 12, 11, 14, 16, 15, 18, 20, 22],
    },
    {
      label: "Errors · 7d",
      value: "—",
      delta: "—",
      tone: "muted" as const,
      sparkline: [8, 6, 7, 5, 4, 3, 5, 4, 3, 2, 3, 2, 3, 3],
    },
  ];

  const quickActions = [
    {
      label: "New page",
      icon: "📄",
      href: `/${workspace}/site/pages?new=1`,
    },
    {
      label: "Write post",
      icon: "📝",
      href: `/${workspace}/site/blog?new=1`,
    },
    { label: "Upload media", icon: "📸", href: `/${workspace}/site/media` },
    { label: "Add redirect", icon: "🔗", href: `/${workspace}/site/seo` },
    {
      label: "Edit navigation",
      icon: "🗂️",
      href: `/${workspace}/site/design`,
    },
    { label: "Open design", icon: "🎨", href: `/${workspace}/site/design` },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Hero */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <div
            className="mono mb-2 text-xs uppercase tracking-wide"
            style={{ color: "var(--ink-4)" }}
          >
            ● Site online
            {primaryDomain && !domainsLoading && <> · last deployed 14m ago</>}
            {domainsLoading && (
              <>
                {" "}
                · <Skeleton className="inline-block w-24 h-4" />
              </>
            )}
          </div>
          <h1
            className="serif m-0 text-2xl font-semibold"
            style={{ letterSpacing: "-0.4px" }}
          >
            Good evening, {greeting}.
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            Here&apos;s what&apos;s happening on{" "}
            <span className="mono">{siteName}</span> today.
          </p>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        {/* Left column */}
        <div className="space-y-3">
          {/* Quick actions */}
          <Card className="p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Quick actions</div>
              <div className="mono text-xs" style={{ color: "var(--ink-4)" }}>
                ⌘K to search
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="flex items-center gap-2.5 rounded-md border border-[var(--line)] bg-[var(--bg-sunken)] px-3 py-2.5 text-left text-xs font-medium transition hover:bg-[var(--bg-elev)] active:bg-[var(--bg-active)]"
                >
                  <span className="text-sm">{action.icon}</span>
                  <span className="flex-1">{action.label}</span>
                  <ArrowRight
                    className="h-3 w-3"
                    style={{ color: "var(--ink-4)" }}
                  />
                </button>
              ))}
            </div>
          </Card>

          {/* Recently edited */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Recently edited</div>
              <button
                onClick={() => router.push(`/${workspace}/site/pages`)}
                className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                View all pages →
              </button>
            </div>
            {recentLoading ? (
              <div className="p-3.5 space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : recentEntries.length === 0 ? (
              <div
                className="p-3.5 text-center"
                style={{ color: "var(--ink-3)" }}
              >
                <p className="text-xs">No pages or posts yet</p>
              </div>
            ) : (
              <div>
                {recentEntries.slice(0, 3).map((entry, i, arr) => (
                  <button
                    key={`${entry.kind}-${entry.id}`}
                    onClick={() => router.push(entry.href)}
                    className={`w-full grid grid-cols-[1fr_120px_100px] gap-3 px-3.5 py-2.5 text-left text-xs hover:bg-[var(--bg-sunken)] active:bg-[var(--bg-active)] ${i < arr.length - 1 ? "border-b border-[var(--line-2)]" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{entry.title}</div>
                      <div className="mono text-xs text-[var(--ink-4)]">
                        {entry.kind === "post" ? "blog · " : ""}
                        {entry.slug}
                      </div>
                    </div>
                    <Badge
                      variant={entry.isPublished ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {entry.isPublished ? "published" : "draft"}
                    </Badge>
                    <span className="mono text-xs text-[var(--ink-3)]">
                      {new Date(
                        entry.updatedAt ?? new Date(),
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Form submissions */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">New form submissions</div>
              <button
                onClick={() => router.push(`/${workspace}/site/forms`)}
                className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                Open inbox →
              </button>
            </div>
            <div
              className="p-3.5 text-center text-xs"
              style={{ color: "var(--ink-3)" }}
            >
              No recent submissions
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Publishing pipeline */}
          <Card className="p-3.5">
            <div className="mb-3 text-sm font-semibold">
              Publishing pipeline
            </div>
            <div>
              <div className="flex items-center gap-2.5 py-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--ink-3)" }}
                />
                <span className="flex-1 text-sm">Drafts</span>
                <span className="mono text-xs font-semibold">
                  {recentLoading ? "—" : pipeline.drafts}
                </span>
              </div>
              <div className="border-t border-[var(--line-2)] flex items-center gap-2.5 py-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--warn)" }}
                />
                <span className="flex-1 text-sm">In review</span>
                {/* No workflow status enum yet — surface as "—" until one ships. */}
                <span className="mono text-xs font-semibold">—</span>
              </div>
              <div className="border-t border-[var(--line-2)] flex items-center gap-2.5 py-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--info)" }}
                />
                <span className="flex-1 text-sm">Scheduled</span>
                <span className="mono text-xs font-semibold">
                  {recentLoading ? "—" : pipeline.scheduled}
                </span>
              </div>
              <div className="border-t border-[var(--line-2)] flex items-center gap-2.5 py-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--success)" }}
                />
                <span className="flex-1 text-sm">Live</span>
                <span className="mono text-xs font-semibold">
                  {recentLoading ? "—" : pipeline.live}
                </span>
              </div>
            </div>
          </Card>

          {/* Domains */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Domains</div>
              <button
                onClick={() => router.push(`/${workspace}/site/domains`)}
                className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                Manage →
              </button>
            </div>
            {domainsLoading ? (
              <div className="p-2 space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : domains && domains.length > 0 ? (
              <div className="space-y-1.5 p-2">
                {domains.slice(0, 2).map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center gap-2.5 px-2 py-1.5"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: "var(--success)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mono text-xs font-medium">
                        {domain.hostname}
                      </div>
                      <div className="text-xs text-[var(--ink-4)]">
                        {domain.isPrimary ? "Primary" : "Secondary"}
                      </div>
                    </div>
                    {domain.isPrimary && <Badge>Primary</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-3.5 text-center text-xs"
                style={{ color: "var(--ink-3)" }}
              >
                No domains configured
              </div>
            )}
          </Card>

          {/* Activity */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3">
              <div className="text-sm font-semibold">Activity</div>
            </div>
            {recentLoading ? (
              <div className="p-3.5 space-y-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : recentEntries.length > 0 ? (
              <ActivityTimeline
                activities={recentEntries.slice(0, 3).map((entry) => ({
                  who: "You",
                  what: "edited",
                  target: entry.title,
                  time: new Date(
                    entry.updatedAt ?? new Date(),
                  ).toLocaleDateString(),
                }))}
              />
            ) : (
              <div
                className="p-3.5 text-center text-xs"
                style={{ color: "var(--ink-3)" }}
              >
                No activity yet
              </div>
            )}
          </Card>

          {/* Team */}
          <Card className="p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-sm font-semibold">Team</div>
              <button className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
                Invite +
              </button>
            </div>
            {teamLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <TeamAvatars
                team={teamMembers.slice(0, 4).map((member, idx) => {
                  const colors = ["#E8C547", "#7C3AED", "#EC4899", "#06B6D4"];
                  const displayName = member.username || member.email || "User";
                  return {
                    initials:
                      displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?",
                    name: displayName,
                    role: member.role,
                    color: colors[idx % colors.length] || "#06B6D4",
                  };
                })}
              />
            ) : (
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                You&apos;re the only member
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
