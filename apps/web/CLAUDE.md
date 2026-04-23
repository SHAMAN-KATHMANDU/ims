# Web App Conventions (`apps/web`)

Stack: Next.js App Router · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · TanStack Query v5 · Zustand v5 · React Hook Form v7 · Zod v3 · Axios.

Project-wide rules live in the monorepo `.claude/rules/` directory (loaded automatically when available). This file documents web-specific conventions that aren't covered elsewhere.

---

## Spacing Scale

Use a narrow set of vertical and inline spacing tokens. Prefer these over ad-hoc values.

### Vertical rhythm (Tailwind `space-y-*`)

| Level            | Token       | Use for                                           |
| ---------------- | ----------- | ------------------------------------------------- |
| Page shell       | `space-y-6` | Sections that sit directly under a `<PageHeader>` |
| Card body        | `space-y-4` | Stack of fields or subsections inside a `<Card>`  |
| Form row group   | `space-y-3` | Grouped rows within a card section                |
| Tight list       | `space-y-2` | Dense lists (nav items, tight notifications)      |
| Comfortable list | `space-y-4` | Default for anything not dense                    |

### Inline spacing (Tailwind `gap-*`)

| Level             | Token   | Use for                    |
| ----------------- | ------- | -------------------------- |
| Form field pair   | `gap-2` | Label + input, icon + text |
| Button row        | `gap-2` | Action button clusters     |
| Card grid         | `gap-4` | Grid of cards              |
| Page section grid | `gap-6` | Sections side by side      |

### Avoid

- `mb-6` / `mt-4` / `pb-3` etc. to create rhythm — prefer `space-y-*` on the parent
- Arbitrary values like `space-y-[14px]` — pick from the scale
- Stacking `gap` and `space` on the same element
- Mixing `space-y-4` and `space-y-6` within one conceptual level

### Exceptions

- Third-party embedded widgets (charts, editors, drag-drop surfaces) may have internal rhythm — leave them alone
- Dense data tables use tighter cell padding — handled by the `<DataTable>` primitive
- Dialogs and sheets may nest `space-y-4` content under page-level `space-y-6`

### Enforcement

No automated lint. Code review catches drift. As primitives like `<PageHeader>`, `<DataTable>`, `<Empty>`, `<StatusBadge>`, `<SubmitButton>` own more of the layout, files should stop hand-rolling spacing.

---

## Shared UI primitives (keep extending, don't recreate)

`components/ui/` ships the following re-usable primitives. Prefer adopting them over hand-rolling equivalents.

- `<DataTable>` — columns + sort + selection + pagination + mobile-card fallback + empty/loading/error states
- `<SearchInput>` — debounced search with clear button and required `aria-label`
- `<TableSkeleton>` — drop-in row skeleton for table bodies
- `<PageHeader>` — canonical page title + description + actions slot
- `<StatusBadge variant>` — semantic status pills (`success`/`warning`/`info`/`danger`/`muted`)
- `<SubmitButton isLoading label>` — form submit with consistent spinner + disabled state
- `<Empty>` — empty-state block for lists and tables
- Shadcn `Form` + `FormField` + `FormLabel` + `FormControl` + `FormMessage` — auto-wire `htmlFor`/`id`/`aria-describedby` via `React.useId()`. Prefer this over hand-rolled `<Label> + <Input>` pairs.

## Testing

Co-located `*.test.ts(x)` next to source; e2e specs under `e2e/`. See `../../.claude/rules/testing-architecture.md` for the full pyramid.

## ESLint boundaries

Three enforced rule blocks in `apps/web/eslint.config.js`:

1. `no-restricted-imports` — blocks `@/features/<x>/{services,hooks,components,types,validation,store}/**` from outside feature `<x>`, and blocks retired `@/views`/`@/services`. Import a feature only via its `index.ts` barrel.
2. `jsx-a11y/*` — `no-static-element-interactions`, `click-events-have-key-events`, `control-has-associated-label` all at `"error"`.
3. `no-restricted-syntax` — bans inline Zustand selectors (`useStore((s) => s.foo)`) in consumers. Use exported `selectX` selectors instead.
