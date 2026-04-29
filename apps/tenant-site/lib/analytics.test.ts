/**
 * Unit tests for renderAnalyticsScripts().
 *
 * Strategy:
 *   - Import the function + types from ./analytics
 *   - No DOM, no browser APIs — pure React-element inspection
 *   - getChildren() normalises React.Fragment children to an array
 *     regardless of whether there is 1 child (single element) or N children (array)
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderAnalyticsScripts } from "./analytics";
import type { PublicSiteAnalytics } from "./api";

// ── helpers ────────────────────────────────────────────────────────────────

interface ScriptProps {
  id?: string;
  key?: string;
  src?: string;
  strategy?: string;
  dangerouslySetInnerHTML?: { __html: string };
}

/** Unwrap a React Fragment's children into a flat array of typed Script elements. */
function getChildren(node: React.ReactNode): React.ReactElement<ScriptProps>[] {
  if (!node) return [];
  const el = node as React.ReactElement<{ children?: React.ReactNode }>;
  if (!el.props?.children) return [];
  const ch = el.props.children;
  return Array.isArray(ch)
    ? (ch as React.ReactElement<ScriptProps>[]).filter(Boolean)
    : [ch as React.ReactElement<ScriptProps>];
}

/** GA4-only analytics fixture. */
const ga4Only: PublicSiteAnalytics = {
  ga4MeasurementId: "G-ABCDE12345",
  consentMode: "basic",
};

/** GTM-only analytics fixture. */
const gtmOnly: PublicSiteAnalytics = {
  gtmContainerId: "GTM-WXYZ123",
};

/** Meta Pixel-only analytics fixture. */
const pixelOnly: PublicSiteAnalytics = {
  metaPixelId: "123456789012",
};

/** All three trackers + granted consent. */
const allTrackers: PublicSiteAnalytics = {
  ga4MeasurementId: "G-ABCDE12345",
  gtmContainerId: "GTM-WXYZ123",
  metaPixelId: "123456789012",
  consentMode: "granted",
};

// ── suppression guards ──────────────────────────────────────────────────────

describe("renderAnalyticsScripts — suppression guards", () => {
  it("returns null headScripts when isPreview is true", () => {
    const { headScripts, bodyScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: true,
      noIndex: false,
    });
    expect(headScripts).toBeNull();
    expect(bodyScripts).toBeNull();
  });

  it("returns null headScripts when noIndex is true", () => {
    const { headScripts, bodyScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: false,
      noIndex: true,
    });
    expect(headScripts).toBeNull();
    expect(bodyScripts).toBeNull();
  });

  it("returns null headScripts when both isPreview and noIndex are true", () => {
    const { headScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: true,
      noIndex: true,
    });
    expect(headScripts).toBeNull();
  });

  it("returns null headScripts when analytics is null", () => {
    const { headScripts } = renderAnalyticsScripts(null, {
      isPreview: false,
      noIndex: false,
    });
    expect(headScripts).toBeNull();
  });

  it("returns null headScripts when analytics is undefined", () => {
    const { headScripts } = renderAnalyticsScripts(undefined, {
      isPreview: false,
      noIndex: false,
    });
    expect(headScripts).toBeNull();
  });

  it("returns null headScripts when analytics object has no tracker IDs", () => {
    const { headScripts } = renderAnalyticsScripts(
      { consentMode: "basic" },
      { isPreview: false, noIndex: false },
    );
    expect(headScripts).toBeNull();
  });
});

// ── bodyScripts invariant ──────────────────────────────────────────────────

describe("renderAnalyticsScripts — bodyScripts is always null", () => {
  it("bodyScripts is null even when trackers are configured", () => {
    const { bodyScripts } = renderAnalyticsScripts(allTrackers, {
      isPreview: false,
      noIndex: false,
    });
    expect(bodyScripts).toBeNull();
  });
});

// ── GA4 ────────────────────────────────────────────────────────────────────

describe("renderAnalyticsScripts — GA4", () => {
  it("injects exactly 3 Script elements for GA4 (consent-init, loader, config)", () => {
    const { headScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    expect(children).toHaveLength(3);
  });

  it("loader Script src contains the measurement ID", () => {
    const { headScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    // Second child is the gtag.js loader
    const loader = children[1]!;
    expect(loader.props.src).toContain("G-ABCDE12345");
  });

  it("consent-init Script contains 'denied' when consentMode is 'basic'", () => {
    const { headScripts } = renderAnalyticsScripts(
      { ga4MeasurementId: "G-ABCDE12345", consentMode: "basic" },
      { isPreview: false, noIndex: false },
    );
    const children = getChildren(headScripts);
    const consentScript = children[0]!;
    const html: string = consentScript.props.dangerouslySetInnerHTML!.__html;
    expect(html).toContain("'analytics_storage':'denied'");
    expect(html).toContain("'ad_storage':'denied'");
  });

  it("consent-init Script contains 'granted' when consentMode is 'granted'", () => {
    const { headScripts } = renderAnalyticsScripts(
      { ga4MeasurementId: "G-ABCDE12345", consentMode: "granted" },
      { isPreview: false, noIndex: false },
    );
    const children = getChildren(headScripts);
    const consentScript = children[0]!;
    const html: string = consentScript.props.dangerouslySetInnerHTML!.__html;
    expect(html).toContain("'analytics_storage':'granted'");
    expect(html).toContain("'ad_storage':'granted'");
  });

  it("config Script contains the measurement ID in gtag('config',...)", () => {
    const { headScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    const configScript = children[2]!;
    const html: string = configScript.props.dangerouslySetInnerHTML!.__html;
    expect(html).toContain("G-ABCDE12345");
    expect(html).toContain("gtag('config'");
  });

  it("all three GA4 scripts use strategy 'afterInteractive'", () => {
    const { headScripts } = renderAnalyticsScripts(ga4Only, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    children.forEach((child) => {
      expect(child.props.strategy).toBe("afterInteractive");
    });
  });
});

// ── GTM ────────────────────────────────────────────────────────────────────

describe("renderAnalyticsScripts — GTM", () => {
  it("injects exactly 1 Script element for GTM", () => {
    const { headScripts } = renderAnalyticsScripts(gtmOnly, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    expect(children).toHaveLength(1);
  });

  it("GTM script contains the container ID", () => {
    const { headScripts } = renderAnalyticsScripts(gtmOnly, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    const gtmScript = children[0]!;
    const html: string = gtmScript.props.dangerouslySetInnerHTML!.__html;
    expect(html).toContain("GTM-WXYZ123");
    expect(html).toContain("gtm.start");
  });
});

// ── Meta Pixel ─────────────────────────────────────────────────────────────

describe("renderAnalyticsScripts — Meta Pixel", () => {
  it("injects exactly 1 Script element for Meta Pixel", () => {
    const { headScripts } = renderAnalyticsScripts(pixelOnly, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    expect(children).toHaveLength(1);
  });

  it("Pixel script contains the pixel ID and fbq init", () => {
    const { headScripts } = renderAnalyticsScripts(pixelOnly, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    const pixelScript = children[0]!;
    const html: string = pixelScript.props.dangerouslySetInnerHTML!.__html;
    expect(html).toContain("123456789012");
    expect(html).toContain("fbq('init'");
    expect(html).toContain("fbq('track','PageView')");
  });
});

// ── all trackers ───────────────────────────────────────────────────────────

describe("renderAnalyticsScripts — all trackers combined", () => {
  it("injects 5 scripts total: 3 GA4 + 1 GTM + 1 Pixel", () => {
    const { headScripts } = renderAnalyticsScripts(allTrackers, {
      isPreview: false,
      noIndex: false,
    });
    const children = getChildren(headScripts);
    // GA4: consent-init, loader, config (3) + GTM (1) + Pixel (1) = 5
    expect(children).toHaveLength(5);
  });

  it("headScripts is non-null React element when all trackers are configured", () => {
    const { headScripts } = renderAnalyticsScripts(allTrackers, {
      isPreview: false,
      noIndex: false,
    });
    expect(headScripts).not.toBeNull();
  });
});
