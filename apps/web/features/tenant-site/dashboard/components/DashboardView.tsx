"use client";

import { useEffect } from "react";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ExternalLink,
  Plus,
  TrendingUp,
  Clock,
  MessageSquare,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { TeamAvatars } from "./TeamAvatars";

export function DashboardView() {
  const setActions = useTopbarActionsStore((s) => s.setActions);

  useEffect(() => {
    setActions(
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href="#" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Live site
          </a>
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New page
        </Button>
      </div>,
    );

    return () => setActions(null);
  }, [setActions]);

  const stats = [
    {
      label: "Visitors · 7d",
      value: "24,810",
      delta: "+12.4%",
      tone: "success" as const,
      sparkline: [12, 18, 15, 22, 20, 28, 32, 35, 33, 38, 42, 45, 48, 52],
    },
    {
      label: "Avg. session",
      value: "1m 48s",
      delta: "+6s",
      tone: "success" as const,
      sparkline: [22, 21, 24, 26, 25, 27, 28, 29, 30, 28, 30, 31, 32, 33],
    },
    {
      label: "Form submissions",
      value: "118",
      delta: "+23",
      tone: "success" as const,
      sparkline: [4, 6, 5, 8, 7, 10, 12, 11, 14, 16, 15, 18, 20, 22],
    },
    {
      label: "Errors · 7d",
      value: "3",
      delta: "−2",
      tone: "muted" as const,
      sparkline: [8, 6, 7, 5, 4, 3, 5, 4, 3, 2, 3, 2, 3, 3],
    },
  ];

  const quickActions = [
    { label: "New page", icon: "📄" },
    { label: "Write post", icon: "📝" },
    { label: "Upload media", icon: "📸" },
    { label: "Add redirect", icon: "🔗" },
    { label: "Edit navigation", icon: "🗂️" },
    { label: "Open design", icon: "🎨" },
  ];

  const recentPages = [
    {
      id: "1",
      title: "About Us",
      slug: "/about",
      status: "published",
      updated: "2 days ago",
      author: "Sarah",
    },
    {
      id: "2",
      title: "Contact",
      slug: "/contact",
      status: "draft",
      updated: "1 day ago",
      author: "Mike",
    },
    {
      id: "3",
      title: "Services",
      slug: "/services",
      status: "published",
      updated: "3 days ago",
      author: "Alex",
    },
  ];

  const pipelineStatus = [
    { label: "Drafts", count: 2, tone: "default" as const },
    { label: "In review", count: 2, tone: "warning" as const },
    { label: "Scheduled", count: 2, tone: "info" as const },
    { label: "Live", count: 14, tone: "success" as const },
  ];

  const activityData = [
    { who: "Sarah", what: "published", target: "About Us", time: "4h" },
    { who: "Mike", what: "drafted", target: "Contact", time: "2h" },
    {
      who: "Alex",
      what: "submitted for review",
      target: "Services",
      time: "1h",
    },
  ];

  const teamData = [
    { initials: "SK", name: "Sarah Kim", role: "Editor", color: "#E8C547" },
    { initials: "MB", name: "Mike Brown", role: "Admin", color: "#7C3AED" },
    { initials: "AJ", name: "Alex Jones", role: "Viewer", color: "#EC4899" },
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
            ● Site online · last deployed 14m ago
          </div>
          <h1
            className="serif m-0 text-2xl font-semibold"
            style={{ letterSpacing: "-0.4px" }}
          >
            Good evening, Mira.
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            Here's what's happening on{" "}
            <span className="mono">lumenandcoal.com</span> today.
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
              <button className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
                View all pages →
              </button>
            </div>
            <div>
              {recentPages.map((page, i) => (
                <button
                  key={page.id}
                  className={`w-full grid grid-cols-[1fr_120px_100px] gap-3 px-3.5 py-2.5 text-left text-xs hover:bg-[var(--bg-sunken)] active:bg-[var(--bg-active)] ${i < recentPages.length - 1 ? "border-b border-[var(--line-2)]" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{page.title}</div>
                    <div className="mono text-xs text-[var(--ink-4)]">
                      {page.slug}
                    </div>
                  </div>
                  <Badge
                    variant={
                      page.status === "published" ? "default" : "secondary"
                    }
                    className="w-fit"
                  >
                    {page.status}
                  </Badge>
                  <span className="mono text-xs text-[var(--ink-3)]">
                    {page.updated}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Form submissions */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">New form submissions</div>
              <button className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
                Open inbox →
              </button>
            </div>
            <div>
              {[
                {
                  name: "John Doe",
                  form: "Contact",
                  excerpt: "Interested in pricing",
                },
                {
                  name: "Jane Smith",
                  form: "Newsletter",
                  excerpt: "Wants to subscribe",
                },
              ].map((sub, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[28px_1fr_80px] gap-3 px-3.5 py-2.5 items-center ${i < 1 ? "border-b border-[var(--line-2)]" : ""}`}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {sub.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{sub.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {sub.form}
                      </Badge>
                    </div>
                    <div className="text-xs text-[var(--ink-3)] truncate">
                      {sub.excerpt}
                    </div>
                  </div>
                  <span className="mono text-xs text-[var(--ink-4)] text-right">
                    Now
                  </span>
                </div>
              ))}
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
            {pipelineStatus.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 py-2 ${i > 0 ? "border-t border-[var(--line-2)]" : ""}`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      item.tone === "success"
                        ? "var(--success)"
                        : item.tone === "warning"
                          ? "var(--warn)"
                          : item.tone === "info"
                            ? "var(--info)"
                            : "var(--ink-3)",
                  }}
                />
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="mono text-xs font-semibold">{item.count}</span>
              </div>
            ))}
            <div
              className="mt-2.5 rounded border px-2.5 py-2 text-xs"
              style={{
                backgroundColor: "oklch(from var(--warn) l c h / 0.08)",
                borderColor: "oklch(from var(--warn) l c h / 0.25)",
              }}
            >
              <div className="flex gap-2">
                <AlertCircle
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "var(--warn)" }}
                />
                <span>
                  <strong>2 pages</strong> awaiting your review
                </span>
              </div>
            </div>
          </Card>

          {/* Domains */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Domains</div>
              <button className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
                Manage →
              </button>
            </div>
            <div className="space-y-1.5 p-2">
              {[
                {
                  host: "lumenandcoal.com",
                  status: "active",
                  ssl: "valid",
                  primary: true,
                },
                {
                  host: "www.lumenandcoal.com",
                  status: "active",
                  ssl: "valid",
                  primary: false,
                },
              ].map((domain) => (
                <div
                  key={domain.host}
                  className="flex items-center gap-2.5 px-2 py-1.5"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        domain.status === "active"
                          ? "var(--success)"
                          : "var(--warn)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="mono text-xs font-medium">
                      {domain.host}
                    </div>
                    <div className="text-xs text-[var(--ink-4)]">
                      {domain.primary ? "Primary · " : ""}SSL {domain.ssl}
                    </div>
                  </div>
                  {domain.primary && <Badge>Primary</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-3">
              <div className="text-sm font-semibold">Activity</div>
            </div>
            <ActivityTimeline activities={activityData} />
          </Card>

          {/* Team */}
          <Card className="p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-sm font-semibold">Team</div>
              <button className="mono text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
                Invite +
              </button>
            </div>
            <TeamAvatars team={teamData} />
          </Card>
        </div>
      </div>
    </div>
  );
}
