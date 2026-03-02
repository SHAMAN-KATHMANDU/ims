"use client";

import Link from "next/link";
import { useDeal, useUpdateDealStage } from "@/hooks/useDeals";
import { useActivitiesByDeal } from "@/hooks/useActivities";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogActivityForm } from "../components/LogActivityForm";
import type { Deal } from "@/services/dealService";
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

export function DealDetail({ dealId, basePath, onEdit }: DealDetailProps) {
  const { data, isLoading } = useDeal(dealId);
  const { data: activitiesData } = useActivitiesByDeal(dealId);
  const updateStageMutation = useUpdateDealStage();

  const deal = data?.deal;
  const activities = activitiesData?.activities ?? [];
  const stages = useStagesFromDeal(deal);
  const tasks = deal?.tasks ?? [];

  if (isLoading || !deal) {
    return <Skeleton className="h-96 w-full" />;
  }

  const handleStageChange = (stage: string) => {
    updateStageMutation.mutate({ id: dealId, stage });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deal.name}</h1>
          <p className="text-2xl font-semibold mt-1">
            {formatCurrency(Number(deal.value))}
          </p>
        </div>
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
      </div>

      <div className="space-y-2 text-sm">
        <p>Stage: {deal.stage}</p>
        <p>Status: {deal.status}</p>
        <p>Probability: {deal.probability}%</p>
        {deal.expectedCloseDate && (
          <p>
            Expected close:{" "}
            {new Date(deal.expectedCloseDate).toLocaleDateString()}
          </p>
        )}
        {deal.contact && (
          <p>
            Contact:{" "}
            <Link href={`${basePath}/crm/contacts/${deal.contact.id}`}>
              <span className="text-primary hover:underline">
                {deal.contact.firstName} {deal.contact.lastName || ""}
              </span>
            </Link>
          </p>
        )}
        {deal.company && <p>Company: {deal.company.name}</p>}
        {deal.assignedTo && <p>Assigned to: {deal.assignedTo.username}</p>}
      </div>

      {stages.length > 1 && (
        <div>
          <label className="text-sm font-medium">Change stage</label>
          <Select value={deal.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="mt-1 w-[200px]">
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

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
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
            <h3 className="font-medium mb-2">Recent Activities</h3>
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
          </div>
        </TabsContent>
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <Link href={`${basePath}/crm/tasks/new?dealId=${dealId}`}>
            <Button size="sm">Add Task</Button>
          </Link>
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
                      <Check className="h-4 w-4 text-green-600" />
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
