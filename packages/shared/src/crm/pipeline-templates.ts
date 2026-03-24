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
    templateId: "new-sales",
    name: "New Sales",
    description:
      "Standard B2B funnel from new lead through negotiation to closed won or lost. Best as the default pipeline for new deals.",
    type: "NEW_SALES",
    stageNames: [
      "New Lead",
      "Qualifying",
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
      "Re-engage past buyers or dormant contacts: follow-up, dormancy, re-activation, and purchase intent.",
    type: "REMARKETING",
    stageNames: [
      "Post-Purchase Follow-up",
      "Dormant",
      "Re-engaged",
      "Active Interest",
      "Purchase Intent",
    ],
    probabilities: [20, 5, 30, 50, 80],
    suggestAsDefault: false,
  },
  {
    templateId: "repurchase",
    name: "Repurchase",
    description:
      "Drive repeat purchases: return visits, needs assessment, loyalty offers, and close.",
    type: "REPURCHASE",
    stageNames: [
      "Returned",
      "Needs Assessment",
      "Loyalty Offer Made",
      "Negotiating",
      "Closed Won",
      "Closed Lost",
    ],
    probabilities: [30, 40, 60, 75, 100, 0],
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
