/**
 * Version management - reads from root VERSION file.
 * Single source of truth for application version.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

let cachedVersion: string | null = null;
let warnedVersionFallback = false;

function readTextIfExists(path: string): string | null {
  if (!existsSync(path)) return null;
  const value = readFileSync(path, "utf-8").trim();
  return value.length > 0 ? value : null;
}

function readPackageVersion(path: string): string | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as { version?: string };
  const value = parsed.version?.trim() ?? "";
  return value.length > 0 ? value : null;
}

/**
 * Get the application version from VERSION file.
 * Caches the result for performance.
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Prefer explicit CI/CD-provided version when available.
    const envVersion = process.env.APP_VERSION?.trim();
    if (envVersion) {
      cachedVersion = envVersion;
      return cachedVersion;
    }

    const versionCandidates = [
      join(process.cwd(), "VERSION"),
      join(__dirname, "../../../../VERSION"),
      join(__dirname, "../../../VERSION"),
    ];
    for (const candidate of versionCandidates) {
      const version = readTextIfExists(candidate);
      if (version) {
        cachedVersion = version;
        return cachedVersion;
      }
    }

    const packageCandidates = [
      join(process.cwd(), "package.json"),
      join(process.cwd(), "apps/api/package.json"),
      join(__dirname, "../../../../package.json"),
      join(__dirname, "../../../package.json"),
      join(__dirname, "../../package.json"),
    ];
    for (const candidate of packageCandidates) {
      const version = readPackageVersion(candidate);
      if (version) {
        cachedVersion = version;
        return cachedVersion;
      }
    }
  } catch {
    // Fall through to static fallback.
  }

  cachedVersion = "1.0.0";
  if (!warnedVersionFallback) {
    warnedVersionFallback = true;
    console.warn(
      "Could not determine app version from APP_VERSION, VERSION, or package.json; using 1.0.0",
    );
  }
  return cachedVersion;
}
