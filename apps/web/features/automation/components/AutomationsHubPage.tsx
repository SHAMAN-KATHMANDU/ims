"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Zap, ArrowRight } from "lucide-react";
import { useEnvFeatureFlag, useFeatureFlag } from "@/features/flags";
import { EnvFeature, Feature } from "@repo/shared";

export function AutomationsHubPage(): ReactElement {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "";
  const base = workspace ? `/${workspace}` : "";

  const eventAutomationsEnabled = useEnvFeatureFlag(EnvFeature.AUTOMATION);
  const pipelineRulesEnv = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  const salesPipelinePlan = useFeatureFlag(Feature.SALES_PIPELINE);
  const pipelineRulesEnabled = pipelineRulesEnv && salesPipelinePlan;

  const hasAny = eventAutomationsEnabled || pipelineRulesEnabled;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-1">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
        <p className="mt-2 text-muted-foreground">
          Choose how you want to automate work. Event automations run across the
          whole product; deal pipeline rules only react when a deal moves in a
          CRM pipeline.
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          Automations are not enabled for this environment or plan. Contact your
          administrator if you need them turned on.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1">
          <Card
            className={
              eventAutomationsEnabled ? "" : "opacity-60 border-dashed"
            }
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" aria-hidden />
                <CardTitle>Event automations</CardTitle>
              </div>
              <CardDescription>
                When something happens anywhere in the app—sales, inventory,
                CRM, catalog—run steps in order: create tasks, send
                notifications, update records, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventAutomationsEnabled ? (
                <Button asChild>
                  <Link href={`${base}/settings/automation`}>
                    Open event automations
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not available in this deployment.
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className={pipelineRulesEnabled ? "" : "opacity-60 border-dashed"}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" aria-hidden />
                <CardTitle>Deal pipeline rules</CardTitle>
              </div>
              <CardDescription>
                Legacy-friendly rules tied to one CRM pipeline: when a deal
                enters or leaves a stage (or is won/lost), perform a single
                action such as creating a task or moving the deal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pipelineRulesEnabled ? (
                <Button asChild variant="secondary">
                  <Link href={`${base}/settings/crm/workflows`}>
                    Open deal pipeline rules
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Requires CRM workflows and the Sales Pipeline plan feature.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
