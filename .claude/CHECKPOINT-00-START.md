# Checkpoint 00 — Starting State

**Branch:** `fix/bug/12-mar-final`
**Date:** 2026-03-12
**Status:** Plan created, no changes yet

## What This Project Is

Monorepo with:
- `apps/api` — Express + Prisma + Vitest backend
- `apps/web` — Next.js App Router + React 19 + Vitest frontend
- `packages/shared` — shared config (plan limits, feature flags)

## Key Commands

```bash
# Tests
cd apps/api && pnpm test:run          # API tests
cd apps/web && pnpm test:run          # Web tests
cd apps/api && npx tsc --noEmit       # API type check
cd apps/web && npx tsc --noEmit       # Web type check

# Dev server (already running)
pnpm dev                              # runs both API + Web
```

## Bug Report Summary

80+ issues across 19 sections. See `.claude/PLAN.md` for full execution plan.

## Files You Will Touch Most

- `apps/web/components/ui/dialog.tsx` — unsaved changes guard
- `apps/web/components/ui/sheet.tsx` — unsaved changes guard
- `apps/web/components/ui/phone-input.tsx` — country flags rewrite
- `apps/web/features/products/components/components/ProductForm.tsx` — per-step validation
- `apps/web/features/sales/components/components/NewSaleForm.tsx` — sales enterprise upgrade
- `apps/web/features/auth/components/LoginForm.tsx` — forgot password link
- `apps/web/features/crm/` — CRM fixes
- `apps/web/components/layout/sidebar.tsx` — plan gating
- `apps/api/src/modules/auth/` — password reset endpoints
- `apps/api/src/modules/sales/` — soft delete, edit branching
- `apps/api/src/modules/pipelines/` — default pipelines, workflows
- `apps/api/prisma/schema.prisma` — new models
- `packages/shared/src/config/features.ts` — plan limits
