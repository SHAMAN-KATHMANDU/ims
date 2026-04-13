# Workflow Platform Rollout And Testing Plan

## Delivery Order

1. Template catalog and install flows
2. Workflow provenance metadata and richer template set
3. Execution history and workflow health counters
4. UI surfacing for ready-made workflows and run visibility
5. Future phases: branching, delays, webhooks, and advanced governance

## Safety Controls

- Keep CRM workflow routes behind existing env and plan guards
- Preserve current workflow CRUD contracts while adding new optional metadata
- Treat template installation as additive
- Allow reinstall without forcing tenant custom workflows to be deleted manually

## Verification Layers

- Schema tests for template install params and run query params
- Service tests for template catalog, install, and run-history retrieval
- Controller tests for new endpoints
- Engine tests for run-history writes on success and failure
- Web service and hook tests for template catalog/install calls
- UI tests for template rendering and install CTA

## Key Edge Cases To Cover

- Template install without a compatible pipeline
- Reinstalling an already-installed template
- Hidden/default workflows not showing in empty states
- Failed action execution still being visible in run history
- Template-backed workflow edited later and still shown as installed provenance
- Disabled CRM workflow flag preventing frontend queries

## Rollout Notes

- Start with internal/staging rollout using the existing `CRM_WORKFLOWS` gate
- Confirm install and run-history behavior on seeded framework pipelines
- Verify no regressions in current workflow CRUD, deal stage automation, and sale-triggered purchase-count events
- After validation, expand template coverage with more categories and cross-product actions
