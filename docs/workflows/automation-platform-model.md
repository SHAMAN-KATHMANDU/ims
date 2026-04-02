# Automation Platform Model

## Canonical Direction

The strategic automation platform is the generic event-driven automation system under `apps/api/src/modules/automation`.

The legacy CRM workflow engine under `apps/api/src/modules/workflows` remains a compatibility layer for deal-centric workflow rules while existing templates and data continue to operate.

## Platform Layers

1. Domain services emit stable automation events after successful business transitions.
2. Shared enums and schemas in `packages/shared/src/automation` define the canonical trigger and action contract.
3. The automation runtime resolves matching definitions, evaluates conditions, executes steps, and records run history.
4. The frontend automation builder becomes the primary authoring surface for new automation work.

### Runtime behavior (authoritative)

- **Trigger delay (`delayMinutes`)**: When greater than zero, matching work is stored as a `AutomationDelayedRun` row with a `fireAt` time instead of executing immediately. A background sweep (same interval as automation event retries) claims due rows and runs the automation against the original stored event payload. The parent `AutomationEvent` is still marked processed after the initial sweep so delayed work does not block other automations on that event.
- **Condition operator `in`**: Values are normalized to arrays at validation time (API and shared Zod). The runtime also accepts comma-separated strings and JSON arrays for robustness when reading stored JSON.
- **Replay API** (`POST /automation/events/:id/replay`): `reprocessFromStart: true` (default) queues a full replay by publishing a new automation event. `reprocessFromStart: false` first attempts to **resume** failed `LIVE` runs linked to that event from the first failed step; if none are resumable, the service falls back to a full replay.

## Migration Rule

Prefer adding new trigger families and action capabilities to the generic automation platform instead of extending the legacy workflow engine.

Legacy CRM workflows should only be extended when required for backward compatibility.

## Legacy To Generic Mapping

| Legacy CRM workflow    | Generic automation                                                |
| ---------------------- | ----------------------------------------------------------------- |
| `DEAL_CREATED`         | `crm.deal.created`                                                |
| `STAGE_ENTER`          | `crm.deal.stage_changed` with condition on `stage`                |
| `STAGE_EXIT`           | `crm.deal.stage_changed` with condition on previous stage payload |
| `CREATE_TASK`          | `workitem.create`                                                 |
| `SEND_NOTIFICATION`    | `notification.send`                                               |
| `MOVE_STAGE`           | `crm.deal.move_stage`                                             |
| `UPDATE_FIELD`         | `record.update_field`                                             |
| `CREATE_ACTIVITY`      | `crm.activity.create`                                             |
| `UPDATE_CONTACT_FIELD` | `crm.contact.update` or `record.update_field` on `CONTACT`        |

## Action Design Guidance

- Prefer entity-specific actions when the operation is business-sensitive or likely to grow validation rules over time.
- Prefer `record.update_field` for low-risk allowlisted field updates across catalog, CRM, and operations entities.
- Keep the runtime contract additive so older definitions remain valid as new triggers and actions are introduced.

## Current First-Class Domains

- CRM
- Catalog
- Inventory and operations
- Sales
- Members
- Transfers
- Work items

## Guardrails

- Domain services remain the event publication boundary.
- New actions must have schema validation, runtime handling, and UI support together.
- Legacy workflow suppression remains enabled when a generic automation intentionally replaces overlapping CRM workflow behavior.
