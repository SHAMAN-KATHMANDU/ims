# Release Process

Production releases are driven by **release-please** from conventional commits.
The human trigger is merging the auto-generated release PR; Docker image
builds are then kicked off via the Release (Production) workflow.

## Automated flow (preferred)

1. Commits landing on `main` must follow the conventional-commit format
   (`feat:`, `fix:`, `perf:`, etc.) — `commitlint.config.js` enforces this
   on PR titles, and squash merges preserve that title as the commit.
2. `.github/workflows/release-please.yml` watches `main`. On each push it
   opens or updates a release PR that bumps `VERSION`, updates
   `CHANGELOG.md`, and is ready to become the next tag.
3. Review the release PR. When ready to ship, **merge it** — release-please
   creates the git tag (e.g. `v1.2.0`) and a matching GitHub Release.
4. Kick off **Actions → Release (Production)** with `release_type=new`,
   `tag_strategy=manual`, `tag=v1.2.0`. That workflow builds + pushes
   `:v1.2.0`, `:prod`, `:latest`.
5. Watchtower on prod EC2 pulls `:prod` and restarts.

## Manual release (fallback)

If release-please is unavailable (e.g. cherry-pick hotfix that shouldn't
go through the automated bump):

1. Go to **Actions → Release (Production)**.
2. Choose `release_type=new`, pick `tag_strategy` (auto_patch / auto_minor /
   auto_major or `manual` with an explicit tag).
3. The workflow creates + pushes the tag, builds images, and pushes them.

## Hotfix (Patch Release)

1. Create branch from the production tag:
   ```bash
   git checkout v1.2.0 -b patch/v1.2.1-fix
   ```
2. Make the fix, push, open PR, get approval, squash merge to `main` (or keep branch for release).
3. **Releases** → **Draft a new release**:
   - **Target:** `patch/v1.2.1-fix` (or `main` if merged).
   - **Tag:** `v1.2.1`.
   - **Publish release**.
4. Merge hotfix branch into `main` if not already merged.

## Rollback

To redeploy a previous version:

1. **Releases** → **Draft a new release**.
2. **Target:** Choose the branch (e.g. `main`).
3. **Tag:** **Choose existing tag** (e.g. `v1.2.0`).
4. **Publish release**.
5. The workflow rebuilds images for that tag and pushes `:prod` / `:latest`.
6. Watchtower pulls and restarts prod.

## Versioning

- **Major** (v2.0.0) — Breaking changes.
- **Minor** (v1.3.0) — New features, backwards compatible.
- **Patch** (v1.2.1) — Bug fixes.
