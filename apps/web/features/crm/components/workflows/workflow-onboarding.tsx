"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WorkflowOnboarding() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "";
  const automationHref = workspace
    ? `/${workspace}/settings/automation`
    : "/settings/automation";

  return (
    <div className="space-y-4">
      <Alert className="border-primary/25 bg-primary/5">
        <Info className="text-primary" aria-hidden />
        <AlertTitle>What pipeline workflows do</AlertTitle>
        <AlertDescription className="space-y-2 text-muted-foreground">
          <p>
            A workflow belongs to <strong>one CRM pipeline</strong>. Each{" "}
            <strong>rule</strong> pairs a <strong>trigger</strong> (for example
            when a deal enters a stage, is created, won, or lost) with an{" "}
            <strong>action</strong> such as creating a task, sending a
            notification, moving the deal, or updating fields.
          </p>
          <p>
            For reactions to{" "}
            <strong>sales, inventory, or cross-cutting events</strong> that are
            not limited to a single pipeline, use{" "}
            <Link
              href={automationHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Settings → Automation
            </Link>{" "}
            instead.
          </p>
        </AlertDescription>
      </Alert>

      <Accordion type="multiple" className="rounded-lg border px-4">
        <AccordionItem value="setup">
          <AccordionTrigger className="text-left font-medium">
            How to set up workflows
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Ensure you have a <strong>pipeline</strong> with the stages your
                process needs.
              </li>
              <li>
                Install a <strong>ready-made template</strong> below (pick the
                pipeline when prompted) or click <strong>New workflow</strong>{" "}
                to build from scratch.
              </li>
              <li>
                Add or edit <strong>rules</strong>: choose the trigger, optional
                stage, action, and configuration.
              </li>
              <li>
                Turn the workflow <strong>Active</strong> when you are ready;
                inactive workflows do not run.
              </li>
            </ol>
            <p>
              After you understand these steps, use the{" "}
              <strong>Ready-made Workflow Templates</strong> section below to
              install packs, or <strong>New workflow</strong> for a custom rule
              set.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="templates-vs-custom">
          <AccordionTrigger className="text-left font-medium">
            Templates vs custom workflows
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Templates</strong> bundle proven rule sets for common
              pipeline types. They show install state (installed, update
              available, or no compatible pipeline yet) and can be updated when
              we ship new versions.
            </p>
            <p>
              <strong>Custom workflows</strong> give full control over name,
              pipeline, and every rule—use them when templates do not match your
              process.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="automations">
          <AccordionTrigger className="text-left font-medium">
            When to use Automations instead
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Use <strong>Automations</strong> when the trigger is a platform
              event (sales, inventory, lead conversion, webhooks, etc.) or when
              you need steps beyond deal-only actions.
            </p>
            <p>
              Automations can optionally{" "}
              <strong>suppress legacy CRM workflows</strong> so both systems do
              not fire duplicate actions for the same CRM event.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
