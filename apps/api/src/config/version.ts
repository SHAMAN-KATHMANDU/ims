/**
 * Version management - reads from root VERSION file.
 * Single source of truth for application version.
 */

import { readFileSync } from "fs";
import { join } from "path";

let cachedVersion: string | null = null;

/**
 * Get the application version from VERSION file.
 * Caches the result for performance.
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // VERSION file is at project root, relative to this file: ../../../../VERSION
    const versionPath = join(__dirname, "../../../../VERSION");
    const version = readFileSync(versionPath, "utf-8").trim();
    cachedVersion = version;
    return version;
  } catch (error) {
    // Fallback to package.json version if VERSION file not found
    console.warn("Could not read VERSION file, falling back to package.json");
    return "1.0.0";
  }
}
