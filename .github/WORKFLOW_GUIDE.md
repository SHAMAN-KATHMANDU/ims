# Workflow & Release Guide

Single-branch, tag-based CI/CD. `main` for staging; production via semantic version tags.

## Overview

- **main** — only permanent branch. All work branches from `main`.
- **Staging** — auto-deploys when PRs are squash-merged into `main`.
- **Production** — manual release via GitHub Releases UI. Tags (v1.0.0) control prod, not branches.
- **Rollback** — publish a release for a previous tag.
- **Hotfix** — branch from tag, fix, release from that branch, merge to main.

## Branching Model

| Branch type | Naming pattern        | Lifecycle                   |
| ----------- | --------------------- | --------------------------- |
| Feature     | #42-feat/payment-flow | Deleted after merge         |
| Fix         | #87-fix/timeout-bug   | Deleted after merge         |
| Hotfix      | patch/payment-crash   | Merge to main after release |
| Main        | main                  | Permanent                   |

Always branch from `main`. Keep branches short-lived.

## Conventional Commits

Format: `type(scope): description`

| Type     | Use case         | Version impact |
| -------- | ---------------- | -------------- |
| feat     | New feature      | Minor bump     |
| fix      | Bug fix          | Patch bump     |
| perf     | Performance      | Patch bump     |
| chore    | Maintenance      | No bump        |
| docs     | Documentation    | No bump        |
| refactor | Code restructure | No bump        |
| test     | Tests            | No bump        |
| ci       | CI/CD changes    | No bump        |

Breaking: `feat(api)!:` or footer `BREAKING CHANGE:` — Major bump.

See [COMMIT_CONVENTION.md](COMMIT_CONVENTION.md) for details.

## PR Requirements

- Title follows conventional commits (becomes squash commit message).
- Linked GitHub issue.
- At least 1 approval.
- CI passes.
- Squash merge only.
- Linear history.

## Staging Flow

1. Create branch from `main`.
2. Open PR with conventional title.
3. CI runs (lint, typecheck, tests).
4. Squash merge to `main`.
5. Staging auto-deploys.

## Production Release (Releases UI)

1. **Releases** → **Draft a new release**.
2. **Target:** `main`.
3. **Tag:** New tag (e.g. `v1.2.0`).
4. Use **Generate release notes** or edit.
5. **Publish release** → workflow builds and deploys prod.

See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for details.

## Hotfix

1. `git checkout v1.2.0 -b patch/v1.2.1-fix`
2. Fix, push, open PR, merge to `main`.
3. **Releases** → Target `patch/v1.2.1-fix` (or `main`) → Tag `v1.2.1` → Publish.
4. Merge hotfix branch to `main` if not already merged.

## Rollback

**Releases** → **Draft new release** → **Choose existing tag** (e.g. `v1.2.0`) → **Publish**. Workflow rebuilds and redeploys that version.

## Quick Reference

| Scenario    | Action                                                      |
| ----------- | ----------------------------------------------------------- |
| New release | Releases → Target main → Tag vX.Y.Z → Publish               |
| Rollback    | Releases → Choose existing tag → Publish                    |
| Hotfix      | Branch from tag → Fix → Release from branch → Merge to main |

## Issue Templates

- **Bug** — steps to reproduce, expected vs actual.
- **Feature** — problem, proposed solution.
- **Epic** — goals, success criteria.
- **Task** — description, parent, acceptance criteria.
- **Performance** — where, observed, environment.
- **Security** — severity, description, steps.
- **Deployment** — environment, rollback plan.
- **CI/CD** — type, affected workflows.
- **Technical Debt** — location, reason, approach.
- **Customer Feedback** — source, priority.
