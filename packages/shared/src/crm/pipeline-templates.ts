/**
 * Canonical CRM pipeline templates: descriptions and stage definitions for
 * frontend selection and API seed-framework. No DB ids — callers assign UUIDs per stage on create.
 */

export type PipelineTemplateType =
  | "GENERAL"
  | "NEW_SALES"
  | "REMARKETING"
  | "REPURCHASE";

export interface CrmPipelineTemplate {
  /** Stable id for UI / analytics (not a DB primary key). */
  templateId: string;
  name: string;
  description: string;
  type: PipelineTemplateType;
  /** Stage names in order; paired with `probabilities` by index. */
  stageNames: string[];
  probabilities: number[];
  /** When true, this template is a good default when marking `isDefault` on first pipeline. */
  suggestAsDefault: boolean;
  closedWonStageName?: string;
  closedLostStageName?: string;
}

export const CRM_PIPELINE_TEMPLATES: readonly CrmPipelineTemplate[] = [
  {
    templateId: "sales",
    name: "Sales",
    description:
      "Primary sales funnel from first contact through negotiation to a won or lost outcome.",
    type: "NEW_SALES",
    stageNames: [
      "New Lead",
      "Qualified",
      "Proposal Sent",
      "Negotiating",
      "Closed Won",
      "Closed Lost",
    ],
    probabilities: [10, 25, 50, 75, 100, 0],
    suggestAsDefault: true,
    closedWonStageName: "Closed Won",
    closedLostStageName: "Closed Lost",
  },
  {
    templateId: "remarketing",
    name: "Remarketing",
    description:
      "Re-engage past buyers with follow-ups, nurture, and win-back steps.",
    type: "REMARKETING",
    stageNames: [
      "Follow-up Due",
      "Nurturing",
      "Re-engaged",
      "Offer Sent",
      "Closed Won",
      "Closed Lost",
    ],
    probabilities: [20, 40, 60, 75, 100, 0],
    suggestAsDefault: false,
    closedWonStageName: "Closed Won",
    closedLostStageName: "Closed Lost",
  },
  {
    templateId: "repurchase",
    name: "Repurchasing",
    description:
      "Drive repeat purchases with targeted review, offer, and close stages.",
    type: "REPURCHASE",
    stageNames: [
      "Existing Customer",
      "Needs Review",
      "Offer Sent",
      "Negotiating",
      "Closed Won",
      "Closed Lost",
    ],
    probabilities: [25, 40, 60, 75, 100, 0],
    suggestAsDefault: false,
    closedWonStageName: "Closed Won",
    closedLostStageName: "Closed Lost",
  },
] as const;

export function getCrmPipelineTemplateById(
  templateId: string,
): CrmPipelineTemplate | undefined {
  return CRM_PIPELINE_TEMPLATES.find((t) => t.templateId === templateId);
}
