---
name: incident-response
description: Runbook templates, rollback procedures, communication templates.
origin: projectX-audit
---

# Incident Response

Structured approach to handling production incidents.

## When to Activate

- Production incident
- Planning runbooks
- Post-incident review
- Deployment rollback

## Runbook Template

1. **Detect** — Alert, symptom, affected users
2. **Triage** — Severity (P1–P4), scope
3. **Mitigate** — Short-term fix (rollback, disable feature, scale)
4. **Resolve** — Root cause fix
5. **Communicate** — Status page, stakeholders
6. **Learn** — Post-mortem, action items

## Rollback Procedure

- `docker compose pull` previous image tag
- `docker compose up -d` to roll back
- Verify health endpoint
- Notify team

## Communication Template

- **Internal**: What happened, impact, ETA, next steps
- **External**: User-facing status update (avoid technical jargon)
