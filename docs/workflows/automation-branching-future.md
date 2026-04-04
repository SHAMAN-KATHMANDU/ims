# Event automations: branching (Phase 3 pointer)

**Normative specification:** [automation-branching-phase3-design.md](./automation-branching-phase3-design.md)

That document is the engineering source of truth: DAG model, requirements **BR-01–BR-25**, validation **V-1–V-12**, **§7.1** completion semantics, **§14** edge-case table, **§10** per-case test IDs (**AT-VAL-\***, **AT-LIV-\***, **AT-SHD-\***, **AT-RSU-\***, **AT-MIG-\***, **AT-UI-\***, **AT-EC-\***), LIVE/SHADOW runtime, persistence and resume (including graph version binding), migration, release gates, and a recommended **3a / 3b / 3c** rollout.

**Deployment policy:** With `AUTOMATION_BRANCHING` **off**, the API rejects non-null `flowGraph` on create/update (`automation.controller.ts`), the canvas does not offer if/switch authoring, and the client submits **linear** `steps` only (`AutomationBuilderPage` `buildPayload`). With the flag **on**, definitions may persist a validated DAG; operators should see **§9** run-history UX (chosen path + branches not taken) and **§8.2** resume behavior. Product copy in the automations feature is **flag-aware** (single-path vs strict linear ordering). See **§9** in the normative doc for the full gate checklist.
