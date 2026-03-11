---
name: dependency-analysis
description: Circular dependency detection, import graph analysis, coupling metrics.
origin: projectX-audit
---

# Dependency Analysis

Understand and maintain clean dependency structure.

## When to Activate

- Adding new modules or features
- Diagnosing build or runtime errors
- Planning architectural changes
- Onboarding to understand codebase structure

## Circular Dependency Detection

- Run `madge --circular apps/api/src` and `madge --circular apps/web`
- Add to CI to prevent new cycles
- Fix by extracting shared code or inverting dependency direction

## Import Graph

- `madge apps/api/src/index.ts` — Visualize dependency tree
- Identify heavy modules (many imports) and potential split points

## Coupling Metrics

- Count imports per file — high count may indicate god module
- Feature → feature imports — should go through public API (index.ts) only
