# Implementation Checklist — Tag-Based CI/CD Migration

Use this as your to-do guide. Check off each item as you complete it.

---

## Pre-requisites

- [ ] Read the migration plan or [.github/WORKFLOW_GUIDE.md](../.github/WORKFLOW_GUIDE.md) for context
- [ ] For server setup: see [SERVER-DEPLOYMENT.md](SERVER-DEPLOYMENT.md)
- [ ] Ensure you have admin/repo maintainer access on GitHub
- [ ] Ensure `develop` and `main` are in a mergeable state

---

## Step 1: Conventional Commits (Local)

- [x] Install commitlint: `pnpm add -D -w @commitlint/cli @commitlint/config-conventional`
- [x] Create `commitlint.config.js` at repo root
- [x] Create `.husky/commit-msg` with: `pnpm exec commitlint --edit $1`
- [ ] Test: `git commit -m "invalid"` should fail; `git commit -m "feat: test"` should pass

---

## Step 2: PR Title Validation (CI)

- [x] Add a job in `.github/workflows/ci.yml` that validates PR title format
- [x] Use commitlint in CI
- [x] Job runs on `pull_request` events

---

## Step 3: PR Template

- [x] Create `.github/pull_request_template.md`
- [ ] Verify it appears when opening a new PR

---

## Step 4: Issue Templates (10 YAML forms)

- [x] Create `.github/ISSUE_TEMPLATE/config.yml` with `blank_issues_enabled: false`
- [x] Create all 10 templates: bug, feature, epic, task, performance, security, deployment, ci-cd, technical-debt, customer-feedback
- [ ] Verify: New issue page shows template chooser

---

## Step 5: Release Workflow

- [x] Create `.github/workflows/release.yml`
- [x] Trigger: `release: published`
- [x] Steps: validate tag (v*.*.\*), checkout tag, build API + Web, push `:<tag>`, `:prod`, `:latest`
- [ ] Ensure Docker Hub secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN) and vars (PROD_UI) exist
- [ ] Test: Create a draft release, tag v0.1.0, publish — workflow should run

---

## Step 6: Staging Workflow

- [x] Rename `build-push-dev.yml` → `build-push-staging.yml`
- [x] Change triggers: remove `develop`, add `main`
- [x] Keep image tag as `:dev` (watchtower.dev expects it)
- [ ] Push to `main` and verify workflow runs

---

## Step 7: Retire build-push-prod

- [x] Remove `.github/workflows/build-push-prod.yml`
- [x] Production deploys only via Releases UI now

---

## Step 8: Cleanup Workflow

- [x] Edit `.github/workflows/cleanup.yml`
- [x] Update protected tags: `latest`, `prod`, `dev`, `staging`, plus semver (v*.*.\*)

---

## Step 9: Documentation Files

- [x] Create `.github/WORKFLOW_GUIDE.md`
- [x] Create `.github/COMMIT_CONVENTION.md`
- [x] Create `.github/RELEASE_PROCESS.md`
- [x] Update `README.md` with links to these docs and new branching model

---

## Step 10: Git Cleanup (Manual — do last)

- [ ] Merge all desired work from `develop` into `main`
- [ ] Create initial tag: `git tag v0.1.0` (on main), `git push origin v0.1.0`
- [ ] Delete `develop`: `git push origin --delete develop` (and locally)
- [ ] Set `main` as default branch in GitHub repo settings

---

## Step 11: Branch Protection

- [ ] Repo → Settings → Branches → Add rule for `main`
- [ ] Require pull request (1 approval)
- [ ] Require status checks (CI jobs)
- [ ] Require linear history (squash or rebase)
- [ ] Restrict pushes (no direct push; require PR)
- [ ] Do not allow force push
- [ ] Save

---

## Step 12: Create GitHub Labels (Optional)

- [ ] Add labels if missing: `bug`, `enhancement`, `epic`, `task`, `performance`, `security`, `deployment`, `ci`, `technical-debt`, `feedback`

---

## Verify End-to-End

- [ ] Create branch from `main`, make change, open PR with conventional title
- [ ] CI passes, PR title validation passes
- [ ] Squash merge → staging workflow runs
- [ ] Create release v0.1.1 from main → release workflow runs
- [ ] Rollback test: publish release for v0.1.0 → workflow runs

---

## Quick Reference

| Need to…        | Do this                                                           |
| --------------- | ----------------------------------------------------------------- |
| Release to prod | Releases → Draft → Target main → Tag vX.Y.Z → Publish             |
| Rollback        | Releases → Draft → Choose existing tag → Publish                  |
| Hotfix          | Branch from tag → Fix → Release from branch → Tag patch → Publish |
