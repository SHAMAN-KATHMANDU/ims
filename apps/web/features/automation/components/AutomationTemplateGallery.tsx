"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Zap,
  ShoppingCart,
  Package,
  Users,
  Bell,
  Globe,
  Search,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AutomationTriggerEventValue } from "@repo/shared";
import { useCreateAutomationDefinition } from "../hooks/use-automation";
import type { CreateAutomationDefinitionInput } from "../services/automation.service";

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "crm"
    | "sales"
    | "inventory"
    | "notifications"
    | "storefront"
    | "members";
  definition: Omit<CreateAutomationDefinitionInput, "name" | "description"> & {
    triggers: Array<{ eventName: AutomationTriggerEventValue }>;
  };
}

const CATEGORY_ICONS = {
  crm: Users,
  sales: Zap,
  inventory: Package,
  notifications: Bell,
  storefront: Globe,
  members: Users,
} as const;

const CATEGORY_LABELS: Record<AutomationTemplate["category"], string> = {
  crm: "CRM",
  sales: "Sales",
  inventory: "Inventory",
  notifications: "Notifications",
  storefront: "Storefront",
  members: "Members",
};

const TEMPLATES: AutomationTemplate[] = [
  {
    id: "welcome-lead",
    name: "Welcome new lead",
    description:
      "When a new lead is created, notify the assigned team member and create a follow-up task.",
    category: "crm",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "crm.lead.created" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "New lead assigned",
            message: "A new lead has been created and assigned to you.",
            type: "INFO",
          },
          continueOnError: true,
        },
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Follow up with new lead",
            type: "FOLLOW_UP",
            priority: "HIGH",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "low-stock-alert",
    name: "Low stock alert",
    description:
      "When inventory falls below the minimum threshold, notify the team and create a restock task.",
    category: "inventory",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "inventory.stock.low_detected" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "Low stock detected",
            message: "A product has fallen below the minimum stock threshold.",
            type: "INFO",
          },
          continueOnError: true,
        },
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Restock required",
            type: "RESTOCK_REQUEST",
            priority: "HIGH",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "website-form-crm",
    name: "Form submission to CRM",
    description:
      "When a visitor submits a contact form on your website, notify the team instantly.",
    category: "storefront",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "storefront.form.submitted" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "New website enquiry",
            message: "A visitor just submitted a contact form on your website.",
            type: "INFO",
          },
          continueOnError: true,
        },
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Review website enquiry",
            type: "FOLLOW_UP",
            priority: "MEDIUM",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "website-order-placed",
    name: "New website order alert",
    description:
      "When a customer places an order on your website, create a verification task for the team.",
    category: "storefront",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "storefront.order.placed" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "New website order",
            message:
              "A new order has been placed on your website and needs verification.",
            type: "INFO",
          },
          continueOnError: true,
        },
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Verify website order",
            type: "APPROVAL",
            priority: "HIGH",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "high-value-sale",
    name: "High-value sale recognition",
    description:
      "When a high-value sale is recorded, notify management and log a follow-up.",
    category: "sales",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "sales.sale.high_value_created" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "High-value sale recorded",
            message:
              "A sale above the high-value threshold has just been recorded.",
            type: "INFO",
          },
          continueOnError: true,
        },
      ],
    },
  },
  {
    id: "deal-stage-task",
    name: "Deal stage follow-up",
    description:
      "When a deal moves stage, create a task to follow up with the customer.",
    category: "crm",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "crm.deal.stage_changed" }],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Follow up after deal stage change",
            type: "FOLLOW_UP",
            priority: "MEDIUM",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "new-member-welcome",
    name: "Welcome new team member",
    description:
      "When a new staff member is added, send them a welcome notification.",
    category: "members",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "members.member.created" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "Welcome to the team!",
            message:
              "Your account has been set up. Reach out to your manager to get started.",
            type: "INFO",
          },
          continueOnError: true,
        },
      ],
    },
  },
  {
    id: "transfer-approval",
    name: "Stock transfer approval",
    description:
      "When a transfer is created, notify the approver and create an approval task.",
    category: "inventory",
    definition: {
      scopeType: "GLOBAL",
      status: "INACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [{ eventName: "transfers.transfer.created" }],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "Transfer awaiting approval",
            message:
              "A stock transfer has been created and is waiting for your approval.",
            type: "INFO",
          },
          continueOnError: true,
        },
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Approve stock transfer",
            type: "APPROVAL",
            priority: "MEDIUM",
          },
          continueOnError: false,
        },
      ],
    },
  },
];

type Category = AutomationTemplate["category"] | "all";

interface AutomationTemplateGalleryProps {
  onClose?: () => void;
}

export function AutomationTemplateGallery({
  onClose,
}: AutomationTemplateGalleryProps): ReactElement {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "";
  const base = workspace ? `/${workspace}` : "";

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const createAutomation = useCreateAutomationDefinition();

  const categories: Category[] = [
    "all",
    "crm",
    "sales",
    "inventory",
    "storefront",
    "notifications",
    "members",
  ];

  const filtered = TEMPLATES.filter((t) => {
    const matchesCategory =
      activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      search.trim() === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: AutomationTemplate) => {
    createAutomation.mutate(
      {
        name: template.name,
        description: template.description,
        ...template.definition,
      },
      {
        onSuccess: (data) => {
          onClose?.();
          if (data?.automation?.id) {
            router.push(`${base}/settings/automation/${data.automation.id}`);
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            No templates match your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((template) => {
            const Icon = CATEGORY_ICONS[template.category];
            return (
              <Card
                key={template.id}
                className="flex flex-col hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {CATEGORY_LABELS[template.category]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <CardDescription className="text-xs leading-relaxed">
                    {template.description}
                  </CardDescription>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Trigger: </span>
                    {template.definition.triggers[0]?.eventName}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-auto w-full"
                    onClick={() => handleUseTemplate(template)}
                    disabled={createAutomation.isPending}
                  >
                    Use template
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
