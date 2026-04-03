"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AutomationOnboarding(): React.ReactElement {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "";
  const workflowsHref = workspace
    ? `/${workspace}/settings/crm/workflows`
    : "/settings/crm/workflows";
  const [guideOpen, setGuideOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <Alert className="border-primary/25 bg-primary/5">
        <Info className="text-primary" aria-hidden />
        <AlertTitle>Automations</AlertTitle>
        <AlertDescription className="text-muted-foreground space-y-3">
          <p className="text-sm">
            Automations listen for platform events, apply optional conditions,
            then run steps in order. Use{" "}
            <strong className="text-foreground">SHADOW</strong> to validate
            before switching to{" "}
            <strong className="text-foreground">LIVE</strong>. Pipeline deal
            rules live in{" "}
            <Link
              href={workflowsHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Settings → CRM → Workflows
            </Link>
            .
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setGuideOpen(true)}
          >
            Learn more
          </Button>
        </AlertDescription>
      </Alert>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent
          side="right"
          allowDismiss
          className="w-full overflow-y-auto sm:max-w-md lg:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>Automation guide</SheetTitle>
            <SheetDescription className="sr-only">
              Detailed concepts, setup steps, and comparisons with pipeline
              workflows.
            </SheetDescription>
          </SheetHeader>
          <div className="text-muted-foreground space-y-4 px-6 pb-6 text-sm">
            <div className="space-y-2">
              <p>
                An automation listens for a <strong>platform event</strong> (for
                example <code className="rounded bg-muted px-1">sales.*</code>,{" "}
                <code className="rounded bg-muted px-1">crm.*</code>, or{" "}
                <code className="rounded bg-muted px-1">inventory.*</code>),
                applies optional <strong>conditions</strong> and delays, then
                runs <strong>steps in order</strong> (create work items, CRM
                updates, webhooks, and more).
              </p>
              <p>
                <strong>LIVE</strong> runs real actions. <strong>SHADOW</strong>{" "}
                records what would happen without executing side effects—use it
                to validate triggers and steps, then check{" "}
                <strong>Recent runs</strong> before switching to LIVE.
              </p>
              <p>
                Deal-centric rules tied to a single pipeline belong in{" "}
                <Link
                  href={workflowsHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Settings → CRM → Workflows
                </Link>
                .
              </p>
            </div>

            <Accordion type="multiple" className="rounded-lg border px-3">
              <AccordionItem value="how">
                <AccordionTrigger className="text-left font-medium">
                  How automations work
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Each <strong>trigger</strong> subscribes to one event name.
                    You can narrow it with <strong>conditions</strong> on fields
                    in the event payload and optionally delay execution by
                    minutes.
                  </p>
                  <p>
                    <strong>Steps</strong> run sequentially. Later steps can use
                    outputs from earlier ones. Enable{" "}
                    <strong>Continue on error</strong> on a step if you want
                    following steps to run even when that step fails.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="setup">
                <AccordionTrigger className="text-left font-medium">
                  Setup checklist
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>
                      Choose <strong>scope</strong>: Global (tenant-wide), a CRM
                      pipeline, a location, or a product variation—where the
                      automation should apply.
                    </li>
                    <li>
                      Add one or more <strong>triggers</strong> with the right
                      event and optional conditions.
                    </li>
                    <li>
                      Add <strong>steps</strong> (actions) in the order they
                      should run.
                    </li>
                    <li>
                      Set execution mode to <strong>SHADOW</strong>, save, and
                      generate real events in your workspace; confirm behavior
                      in <strong>Recent runs</strong>.
                    </li>
                    <li>
                      Switch to <strong>LIVE</strong> when you are satisfied.
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="inventory-locations">
                <AccordionTrigger className="text-left font-medium">
                  Inventory, low stock, and locations
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Events such as{" "}
                    <code className="rounded bg-muted px-1">
                      inventory.stock.low_detected
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-muted px-1">
                      inventory.stock.threshold_crossed
                    </code>{" "}
                    are raised per <strong>warehouse</strong> (location). The
                    platform attaches the location to the event.
                  </p>
                  <p>
                    <strong>Demo:</strong> set <strong>Scope</strong> to{" "}
                    <strong>Location</strong>, choose one warehouse under{" "}
                    <strong>Scope target</strong>, add a low-stock trigger and
                    steps, then use <strong>SHADOW</strong> and{" "}
                    <strong>Recent runs</strong> to verify. Use{" "}
                    <strong>Global</strong> if you want the same automation to
                    run for every site.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="vs-workflows">
                <AccordionTrigger className="text-left font-medium">
                  Pipeline workflows vs automations
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Pipeline workflows</strong> are attached to one CRM
                    pipeline. They react to deal lifecycle moments (stage
                    enter/exit, deal created/won/lost, etc.) and are ideal for
                    sales process automation.
                  </p>
                  <p>
                    <strong>Automations</strong> react to broader platform
                    events across CRM, sales, inventory, and work items. Use
                    them when the trigger is not limited to a single pipeline.
                  </p>
                  <p>
                    If both could fire for the same deal, you can enable{" "}
                    <strong>Suppress legacy CRM workflows</strong> on an
                    automation so matching legacy pipeline workflows do not run
                    for that event.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
