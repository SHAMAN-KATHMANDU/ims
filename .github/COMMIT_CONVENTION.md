# Commit Convention (Conventional Commits)

All commits must follow this format for automated release notes and version bumping.

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

## Types

| Type     | Meaning                   | Version impact |
| -------- | ------------------------- | -------------- |
| feat     | New feature               | Minor bump     |
| fix      | Bug fix                   | Patch bump     |
| perf     | Performance improvement   | Patch bump     |
| chore    | Maintenance, dependencies | No bump        |
| docs     | Documentation only        | No bump        |
| refactor | Code restructuring        | No bump        |
| test     | Add/update tests          | No bump        |
| ci       | CI/CD changes             | No bump        |

## Scope

Optional. Use kebab-case. Examples: `api`, `web`, `auth`, `payments`.

## Breaking Changes

**Option A — In header:**

```
feat(api)!: change response format
```

**Option B — In footer:**

```
feat(api): update response structure

BREAKING CHANGE: response now returns array instead of object
```

Both trigger a **Major version bump**.

## Examples

```
feat(payments): add Stripe webhook handler
fix(auth): resolve session timeout on mobile
chore(deps): upgrade prisma to v6.2.0
refactor(agents): simplify triage logic
docs(api): update webhook documentation
```

## PR Titles

Because we use **Squash Merge**, the PR title becomes the commit on `main`. PR titles must follow the same format:

```
feat(payments): add Stripe webhook handler (#42)
fix(auth): resolve session timeout (#87)
```
