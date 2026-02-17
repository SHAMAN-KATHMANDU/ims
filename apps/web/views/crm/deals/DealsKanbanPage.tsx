"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDealsKanban, useUpdateDealStage } from "@/hooks/useDeals";
import { usePipelines } from "@/hooks/usePipelines";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Deal } from "@/services/dealService";

export function DealsKanbanPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const [pipelineId, setPipelineId] = useState<string>("");
  const { data, isLoading } = useDealsKanban(pipelineId || undefined);
  const { data: pipelinesData } = usePipelines();
  const updateStageMutation = useUpdateDealStage();

  const pipelines = useMemo(
    () => pipelinesData?.pipelines ?? [],
    [pipelinesData?.pipelines],
  );
  const stages = data?.stages ?? [];
  const pipeline = data?.pipeline;

  useEffect(() => {
    const pipelineObj = pipeline as { id?: string } | undefined;
    if (!pipelineId && pipelineObj?.id) setPipelineId(pipelineObj.id);
    else if (!pipelineId && pipelines[0]?.id) setPipelineId(pipelines[0].id);
  }, [pipeline, pipelines, pipelineId]);

  const handleStageChange = (dealId: string, newStage: string) => {
    updateStageMutation.mutate(
      { id: dealId, stage: newStage },
      {
        onSuccess: () => {},
        onError: () => {},
      },
    );
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Deals</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!pipeline && pipelines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Deals</h1>
        <p className="text-muted-foreground">
          No pipeline found. Create a default pipeline first (run prisma seed or
          create via API).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Deals</h1>
        <div className="flex gap-2">
          {pipelines.length > 1 && (
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link href={`${basePath}/crm/deals/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {stages.map((col) => (
          <div
            key={col.stage}
            className="flex-shrink-0 w-72 bg-muted/50 rounded-lg p-3"
          >
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              {col.stage}
              <span className="text-sm font-normal text-muted-foreground">
                {col.deals.length}
              </span>
            </h3>
            <div className="space-y-2">
              {col.deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  basePath={basePath}
                  stages={stages.map((s) => s.stage)}
                  onStageChange={handleStageChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  basePath,
  stages,
  onStageChange,
}: {
  deal: Deal;
  basePath: string;
  stages: string[];
  onStageChange: (dealId: string, stage: string) => void;
}) {
  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
    : deal.member
      ? deal.member.name || deal.member.phone
      : deal.company?.name || "—";

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
      <CardHeader className="p-3 pb-1">
        <Link href={`${basePath}/crm/deals/${deal.id}`}>
          <span className="font-medium hover:underline">{deal.name}</span>
        </Link>
        <p className="text-sm text-muted-foreground">{contactName}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <p className="text-lg font-semibold">
          {formatCurrency(Number(deal.value))}
        </p>
        {deal.expectedCloseDate && (
          <p className="text-xs text-muted-foreground">
            Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
          </p>
        )}
        <Select
          value={deal.stage}
          onValueChange={(v) => onStageChange(deal.id, v)}
        >
          <SelectTrigger className="h-8 text-xs">
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
      </CardContent>
    </Card>
  );
}
