# Release Process

Production releases are manual. Use **Actions → Release (Production) → Run workflow** with the desired options.

## New Release

1. Go to **Actions** → **Release (Production)**.
2. Click **Run workflow**.
3. Set **Release type** to `new`.
4. Choose **Tag strategy**:
   - **auto_patch** (default): Auto-generate next patch (e.g. v1.2.0 → v1.2.1)
   - **auto_minor**: Auto-generate next minor (e.g. v1.2.0 → v1.3.0)
   - **auto_major**: Auto-generate next major (e.g. v1.2.0 → v2.0.0)
   - **manual**: Enter tag in **Tag** field (e.g. `v1.2.0`)
5. Set **Branch** to tag from (default: `main`).
6. **Release notes** (optional): Write notes or leave empty to auto-generate from commits.
7. **Create GitHub Release** (default: true): Creates a GitHub Release with the tag and notes.
8. Click **Run workflow**.
9. The workflow builds API + Web images, pushes `:vX.Y.Z`, `:prod`, `:latest`.
10. Watchtower on prod EC2 pulls `:prod` and restarts.

## Hotfix (Patch Release)

1. Create branch from the production tag:
   ```bash
   git checkout v1.2.0 -b patch/v1.2.1-fix
   ```
2. Make the fix, push, open PR, get approval, squash merge to `main` (or keep branch for release).
3. **Actions** → **Release (Production)** → **Run workflow**:
   - **Release type:** `new`
   - **Tag strategy:** `manual`
   - **Tag:** `v1.2.1`
   - **Branch:** `main` (or `patch/v1.2.1-fix` if not merged yet)
4. Merge hotfix branch into `main` if not already merged.

## Rollback

To redeploy a previous version:

1. Go to **Actions** → **Release (Production)**.
2. Click **Run workflow**.
3. Set **Release type** to `rollback`.
4. Enter the existing tag in **Tag** (e.g. `v1.2.0`). Check the workflow run log for "Recent tags" if you need to copy a tag.
5. **Create GitHub Release** (optional): Leave true to create a rollback release record.
6. Click **Run workflow**.
7. The workflow rebuilds images for that tag and pushes `:prod` / `:latest`.
8. Watchtower pulls and restarts prod.

## Versioning

- **Major** (v2.0.0) — Breaking changes.
- **Minor** (v1.3.0) — New features, backwards compatible.
- **Patch** (v1.2.1) — Bug fixes.
