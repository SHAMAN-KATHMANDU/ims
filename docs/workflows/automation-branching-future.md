# Event automations: branching (Phase 3 pointer)

**Normative specification:** [automation-branching-phase3-design.md](./automation-branching-phase3-design.md)

That document is the engineering source of truth: DAG model, requirements **BR-01–BR-25**, validation **V-1–V-12**, **§7.1** completion semantics, **§14** edge-case table, **§10** per-case test IDs (**AT-VAL-\***, **AT-LIV-\***, **AT-SHD-\***, **AT-RSU-\***, **AT-MIG-\***, **AT-UI-\***, **AT-EC-\***), LIVE/SHADOW runtime, persistence and resume (including graph version binding), migration, release gates, and a recommended **3a / 3b / 3c** rollout.

**Policy until Phase 3 ships:** definitions execute as ordered `AutomationStep` rows (`apps/api/src/modules/automation`). The visual flow builder remains **linear**; product copy should state that steps run in order. Do not promote IF/split/merge in the UI until the specification’s **§9 Product and engineering gates** are met and `AUTOMATION_BRANCHING` is enforced.
