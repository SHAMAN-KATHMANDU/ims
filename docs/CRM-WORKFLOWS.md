# CRM workflows

## Deal status vs stage

- **Status** (`OPEN`, `WON`, `LOST`) is the lifecycle outcome. Triggers **`DEAL_WON`** and **`DEAL_LOST`** fire when status changes to won or lost.
- **Stage** is the pipeline column name (from the pipeline’s `stages` JSON). Triggers **`STAGE_ENTER`** / **`STAGE_EXIT`** fire when the stage string changes.

By default, marking a deal won or lost does **not** change `stage` unless the client sends a `stage` update in the same request.

### Optional: align stage on close

On each pipeline you can set **Closed won stage name** and **Closed lost stage name** (in **Edit pipeline** on the deals Kanban). When set, updating a deal to `WON` or `LOST` without an explicit `stage` will set `stage` to that name. That runs in the same revision as the status change, so stage-based workflow rules can run together with won/lost automations (order: stage exit/enter first when stage changes, then `DEAL_WON` / `DEAL_LOST`).

## Cross-pipeline move (same deal)

The **Move stage** action (`MOVE_STAGE`) can include optional **`targetPipelineId`**. When set, the deal is moved to that pipeline and the target stage (stage id or name must exist on the target pipeline’s `stages` JSON). Probability is taken from the target stage row when possible.

**Rule order when the pipeline changes:**

1. **`STAGE_EXIT`** rules for the **source** pipeline run first (using the deal state before the move).
2. A new deal revision is created with the new `pipelineId` and `stage`.
3. **`STAGE_ENTER`** rules for the **destination** pipeline run, then pipeline transition hooks.

Same-pipeline stage changes still run **`STAGE_EXIT`** then **`STAGE_ENTER`** for that pipeline after the revision.

The API **`PATCH /deals/:id/stage`** accepts optional **`pipelineId`** with the same semantics for manual moves from the UI.

## Cross-pipeline tasks

Tasks are linked to a **deal** (`dealId`), not to a pipeline directly. The **Create task** action can set **task deal link**:

- **Current deal** — default; task attaches to the deal that triggered the rule.
- **Open deal in pipeline** — finds the latest **open** deal for the same **contact** in the chosen pipeline, optionally filtered by **stage name**. If none exists, the task is still created **without** a `dealId` (contact/member/assignee unchanged); a warning is logged server-side.

## Workflow nesting

Automated **Move stage** actions use the same path as user moves (revisions, notifications, follow-on workflows). Nested depth is capped to avoid infinite loops; beyond the cap, further rule evaluation is skipped for that chain while the stage change still applies.
