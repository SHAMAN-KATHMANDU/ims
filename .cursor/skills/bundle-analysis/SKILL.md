---
name: bundle-analysis
description: Frontend bundle size analysis, heavy import detection, code splitting strategies.
origin: projectX-audit
---

# Bundle Analysis

Optimize frontend bundle size and load performance.

## When to Activate

- Slow page loads
- Adding new dependencies
- Before major frontend releases
- Lighthouse/Web Vitals regression

## Tools

- `@next/bundle-analyzer` — Next.js bundle visualization
- `npx vite-bundle-visualizer` — Vite projects
- Lighthouse — Real-world performance

## Heavy Import Patterns

- Barrel exports from large libraries: `import { X } from "lodash"` → `import X from "lodash/X"`
- Dynamic imports for routes: `dynamic(() => import("@/features/foo"))`
- Tree-shake: ensure library supports ESM tree-shaking

## Code Splitting

- Route-based: Each page chunked
- Component-based: `React.lazy` for below-fold components
- Library splitting: Vendor chunk separation
