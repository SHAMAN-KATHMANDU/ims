"use client";

import { useState } from "react";
import Link from "next/link";
import { useEnvFeatureFlag, EnvFeature } from "@/features/flags";
import { useDeal, useUpdateDealStage } from "../../hooks/use-deals";
import { useActivitiesByDeal } from "../../hooks/use-activities";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogActivityForm } from "../LogActivityForm";
import { DealLineItemsSection } from "./DealLineItemsSection";
import {
  StageStrip,
  RevisionChain,
  type RevisionEntry,
} from "../../components/shared";
import { resolveStageColor } from "../../utils/stage-color";
import type { Deal } from "../../services/deal.service";
import { Check } from "lucide-react";

interface DealDetailProps {
  dealId: string;
  basePath: string;
  onEdit?: () => void;
}

function useStagesFromDeal(deal: Deal | undefined): string[] {
  if (!deal?.pipeline?.stages) return [];
  return deal.pipeline.stages.map((s) => s.name);
}

const DEFAULT_ACTIVITY_PAGE_SIZE = 10;

export function DealDetail({ dealId, basePath, onEdit }: DealDetailProps) {
  const [activityPage, setActivityPage] = useState(DEFAULT_PAGE);
  const [activityPageSize, setActivityPageSize] = useState(
    DEFAULT_ACTIVITY_PAGE_SIZE,
  );
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const { data, isPending, isError, error, refetch } = useDeal(dealId);
  const { data: activitiesData } = useActivitiesByDeal(dealId, {
    page: activityPage,
    limit: activityPageSize,
    type:
      activityTypeFilter === "all"
        ? undefined
        : (activityTypeFilter as "CALL" | "EMAIL" | "MEETING"),
  });
  const updateStageMutation = useUpdateDealStage();
  const tasksEnabled = useEnvFeatureFlag(EnvFeature.TASKS);

  const deal = data?.deal;
  const activities = activitiesData?.activities ?? [];
  const activityPagination = activitiesData?.pagination;
  const stages = useStagesFromDeal(deal);
  const tasks = deal?.tasks ?? [];

  if (isPending && !isError) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (isError || !deal) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-3">
        <p className="text-sm font-medium">We couldn&rsquo;t load this deal.</p>
        <p className="text-muted-foreground text-sm">
          {error instanceof Error
            ? error.message
            : "It may have been updated, replaced, or removed. Refreshing the deals list usually clears this up."}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
          <Link href={`${basePath}/crm/deals`}>
            <Button size="sm" variant="outline">
              Back to Deals
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleStageChange = (stage: string) => {
    updateStageMutation.mutate({ id: dealId, stage });
  };

  const statusBadgeVariant = (status: string) => {
    if (status === "WON") return "success" as const;
    if (status === "LOST") return "destructive" as const;
    return "info" as const;
  };

  const pipelineStages =
    deal.pipeline?.stages.map((s, i) => ({
      id: s.id,
      name: s.name,
      color: resolveStageColor(s.color, i),
    })) ?? [];

  const revisions: RevisionEntry[] = deal.revisionNo
    ? [
        {
          no: deal.revisionNo,
          change: deal.editReason || "Current revision",
          at: deal.editedAt
            ? new Date(deal.editedAt).toLocaleString()
            : undefined,
          by: deal.editedBy?.username,
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header: title + status badge + meta row + value */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">{deal.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusBadgeVariant(deal.status)}>
                {deal.status}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold tracking-tight">
              {formatCurrency(Number(deal.value))}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deal.stage} · {deal.probability ?? 0}% probability
            </p>
          </div>
        </div>

        {/* Meta row: contact, company, revision, lead link */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {deal.contact && (
            <Link href={`${basePath}/crm/contacts/${deal.contact.id}`}>
              <span className="text-primary hover:underline">
                {deal.contact.firstName} {deal.contact.lastName || ""}
              </span>
            </Link>
          )}
          {deal.company && <span>{deal.company.name}</span>}
          {deal.revisionNo != null && <span>rev. {deal.revisionNo}</span>}
          {deal.leadId && (
            <Link href={`${basePath}/crm/leads/${deal.leadId}`}>
              <span className="text-primary hover:underline">from lead</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stage strip */}
      {pipelineStages.length > 0 && (
        <StageStrip stages={pipelineStages} currentStage={deal.stage} />
      )}

      {/* Revision chain */}
      {revisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            REVISION HISTORY
          </p>
          <div className="rounded-lg border bg-card p-4">
            <RevisionChain revisions={revisions} />
            <p className="text-xs text-muted-foreground mt-3">
              Edits never mutate a row — each change creates a new immutable
              revision.
            </p>
          </div>
        </div>
      )}

      {/* Stage change control */}
      {stages.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Move to stage</label>
          <Select value={deal.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Edit button */}
      {deal.isLatest !== false && (
        <div className="flex gap-2">
          {onEdit ? (
            <Button onClick={onEdit}>Edit</Button>
          ) : (
            <Link href={`${basePath}/crm/deals/${dealId}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          <Link href={`${basePath}/crm/deals`}>
            <Button variant="outline">Back to Deals</Button>
          </Link>
        </div>
      )}

      <Tabs defaultValue="line-items">
        <TabsList>
          <TabsTrigger value="line-items">Line Items</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="line-items" className="mt-4">
          <DealLineItemsSection deal={deal} basePath={basePath} />
        </TabsContent>
        <TabsContent value="activities" className="mt-4 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Log Activity</h3>
            <LogActivityForm
              dealId={dealId}
              contactId={deal.contactId ?? undefined}
              onSuccess={() => {}}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h3 className="font-medium">Recent Activities</h3>
              <Select
                value={activityTypeFilter}
                onValueChange={(v) => {
                  setActivityTypeFilter(v);
                  setActivityPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activities.length ? (
              <ul className="space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm p-2 bg-muted rounded">
                    <span className="capitalize font-medium">{a.type}</span>
                    {a.subject && `: ${a.subject}`}
                    {a.notes && (
                      <p className="mt-1 text-muted-foreground">{a.notes}</p>
                    )}
                    <span className="text-muted-foreground text-xs block mt-1">
                      {new Date(a.activityAt).toLocaleString()} ·{" "}
                      {a.creator?.username}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No activities yet</p>
            )}
            {activityPagination && (
              <DataTablePagination
                pagination={{
                  currentPage: activityPagination.currentPage,
                  totalPages: activityPagination.totalPages,
                  totalItems: activityPagination.totalItems,
                  itemsPerPage: activityPagination.itemsPerPage,
                  hasNextPage: activityPagination.hasNextPage,
                  hasPrevPage: activityPagination.hasPrevPage,
                }}
                onPageChange={setActivityPage}
                onPageSizeChange={(size) => {
                  setActivityPageSize(size);
                  setActivityPage(DEFAULT_PAGE);
                }}
                isLoading={false}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="tasks" className="mt-4 space-y-4">
          {tasksEnabled && (
            <Link href={`${basePath}/crm/tasks/new?dealId=${dealId}`}>
              <Button size="sm">Add Task</Button>
            </Link>
          )}
          {tasks.length ? (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <Link href={`${basePath}/crm/tasks/${t.id}/edit`}>
                    <span
                      className={
                        t.completed ? "line-through text-muted-foreground" : ""
                      }
                    >
                      {t.title}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    {t.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {t.completed && (
                      <Check
                        className="h-4 w-4 text-green-600"
                        aria-label="Completed"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No tasks</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
