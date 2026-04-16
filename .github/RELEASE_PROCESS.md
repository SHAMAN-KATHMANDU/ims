# Release Process

Production releases are controlled by semantic version tags, triggered via GitHub Releases UI.

## New Release

1. Go to **Releases** → **Draft a new release**.
2. **Target:** Select `main` (or hotfix branch for patches).
3. **Tag:** Create new tag (e.g. `v1.2.0`). Must match semver: `vMAJOR.MINOR.PATCH`.
4. **Title:** Auto-filled from tag. Edit if needed.
5. **Description:** Use "Generate release notes" or write manually.
6. Click **Publish release**.
7. The release workflow runs: builds API + Web images, pushes `:v1.2.0`, `:prod`, `:latest`.
8. Watchtower on prod EC2 pulls `:prod` and restarts.

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
