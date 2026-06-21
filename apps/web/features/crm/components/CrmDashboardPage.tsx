"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Target,
  UserSearch,
  CheckSquare,
  ArrowRight,
  Phone,
  Mail,
  Users,
  Award,
  FileText,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { useCrmDashboard } from "../hooks/use-crm";
import { useTasksPaginated, useCompleteTask } from "../hooks/use-tasks";
import { PipelineFunnel } from "./dashboard/PipelineFunnel";
import { KpiCard, ActivityTimeline, type TimelineItem } from "./shared";
import { formatCompactCurrency } from "../utils/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; bg: string }> = {
  CALL: { icon: Phone, bg: "bg-info" },
  EMAIL: { icon: Mail, bg: "bg-primary" },
  MEETING: { icon: Users, bg: "bg-[hsl(var(--stage-proposal))]" },
  SALE: { icon: Award, bg: "bg-success" },
  NOTE: { icon: FileText, bg: "bg-muted-foreground" },
};

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function CrmDashboardPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const tasksEnabled = useEnvFeatureFlag(EnvFeature.TASKS);

  const { data, isLoading } = useCrmDashboard();
  const d = data?.data;

  const tasksQuery = useTasksPaginated(
    {
      dueToday: true,
      completed: false,
      limit: 6,
      sortBy: "dueDate",
      sortOrder: "asc",
    },
    { enabled: tasksEnabled },
  );
  const completeTask = useCompleteTask();
  const dueTasks = tasksQuery.data?.data ?? [];

  if (isLoading || !d) {
    return (
      <PageShell className="space-y-4">
        <PageHeader title="Dashboard" description="Your pipeline at a glance" />
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
        <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </PageShell>
    );
  }

  const leadsToConvert = Math.max(d.totalLeads - d.convertedLeads, 0);
  // Dashboard funnel = first CRM framework pipeline (NEW_SALES leads the order).
  const funnel = d.pipelineFunnels?.[0];

  const timeline: TimelineItem[] = (d.activitySummary ?? []).map((a) => {
    const kind = (a.type ?? "").toUpperCase();
    const meta = ACTIVITY_ICON[kind] ?? {
      icon: FileText,
      bg: "bg-muted-foreground",
    };
    const who = a.contact
      ? `${a.contact.firstName} ${a.contact.lastName ?? ""}`.trim()
      : (a.deal?.name ?? "—");
    return {
      id: a.id,
      icon: meta.icon,
      iconBgClassName: meta.bg,
      title: (
        <span>
          <span className="font-semibold capitalize">{kind.toLowerCase()}</span>{" "}
          {a.subject ? `· ${a.subject} ` : ""}
          <span className="text-muted-foreground">· {who}</span>
        </span>
      ),
      meta: new Date(a.activityAt).toLocaleDateString(),
    };
  });

  return (
    <PageShell className="space-y-3.5">
      <PageHeader
        title="Dashboard"
        description="Your pipeline at a glance"
        actions={
          <Button asChild>
            <Link href={`${basePath}/crm/deals/new`}>
              <Plus className="h-[18px] w-[18px]" /> New deal
            </Link>
          </Button>
        }
      />

      {/* KPI tiles */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open pipeline"
          value={formatCompactCurrency(d.totalDealsValue)}
          delta="Sum of all open deals"
          icon={TrendingUp}
        />
        <KpiCard
          label="Closing this month"
          value={d.dealsClosingThisMonth}
          delta="Expected to close"
          icon={Target}
        />
        <KpiCard
          label="Leads to convert"
          value={leadsToConvert}
          delta={`${d.convertedLeads}/${d.totalLeads} converted · ${d.leadConversionRate}%`}
          icon={UserSearch}
        />
        <KpiCard
          label="Tasks due today"
          value={d.tasksDueToday}
          delta={d.tasksDueToday > 0 ? "Needs attention" : "All clear"}
          icon={CheckSquare}
          deltaClassName={
            d.tasksDueToday > 0 ? "text-destructive" : "text-success"
          }
        />
      </div>

      {/* Funnel + tasks due */}
      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="gap-0 p-[18px]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">
              Pipeline{funnel ? ` · ${funnel.pipelineName}` : ""}
            </div>
            <Link
              href={`${basePath}/crm/deals`}
              className="flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
            >
              Open board <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <PipelineFunnel stages={funnel?.stages ?? []} />
        </Card>

        <Card className="gap-0 p-[18px]">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm font-semibold">Tasks due</div>
            {tasksEnabled && (
              <Link
                href={`${basePath}/crm/tasks?dueToday=true`}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            )}
          </div>
          {!tasksEnabled ? (
            <p className="text-[13px] text-muted-foreground">
              Tasks are disabled.
            </p>
          ) : tasksQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : dueTasks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nothing due today. 🎉
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {dueTasks.map((t) => {
                const overdue = isOverdue(t.dueDate);
                const linked = t.contact
                  ? `${t.contact.firstName} ${t.contact.lastName ?? ""}`.trim()
                  : (t.deal?.name ?? t.company?.name ?? "");
                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 rounded-lg p-2 hover:bg-secondary"
                  >
                    <button
                      type="button"
                      aria-label="Complete task"
                      disabled={completeTask.isPending}
                      onClick={() => completeTask.mutate(t.id)}
                      className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-input transition-colors hover:border-primary hover:bg-primary/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{t.title}</div>
                      {linked && (
                        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                          {linked}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold",
                        overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="gap-0 p-[18px]">
        <div className="mb-3.5 text-sm font-semibold">Recent activity</div>
        <ActivityTimeline items={timeline} emptyLabel="No recent activity." />
      </Card>
    </PageShell>
  );
}
