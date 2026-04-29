/**
 * Analytics script injection for the tenant-site renderer.
 *
 * renderAnalyticsScripts() returns the <Script> elements that should be
 * injected into the root layout — but ONLY on published, indexable sites.
 *
 * Guard conditions (MUST all be true before injecting anything):
 *   • isPreview === false  — editor /preview/* bypasses tenant middleware;
 *                            injecting would corrupt preview test results.
 *   • noIndex === false    — robots: noindex signals the tenant doesn't
 *                            want the page tracked by external tools.
 *
 * Script strategies:
 *   • GA4  → afterInteractive (standard gtag.js boot)
 *   • GTM  → afterInteractive (GTM noscript needs body insertion — only
 *             the JS loader is handled here; noscript fallback is the
 *             caller's responsibility if required by compliance policy)
 *   • Meta Pixel → afterInteractive (fbevents.js)
 *
 * Uses Next.js built-in <Script> (next/script) — no new dependencies.
 */

import type { ReactNode } from "react";
import Script from "next/script";
import { createElement } from "react";

export interface SiteAnalytics {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  metaPixelId?: string;
  consentMode?: "basic" | "granted";
}

export interface RenderAnalyticsOptions {
  /** True when the request is for an editor preview (/preview/*). */
  isPreview: boolean;
  /** True when the site's SEO robots setting contains "noindex". */
  noIndex: boolean;
}

/**
 * Build the GA4 gtag.js snippet with optional Consent Mode v2 wiring.
 *
 * In "basic" mode we fire analytics but set the default consent to "denied"
 * so GA4 behaves correctly when no consent banner has run yet.
 *
 * In "granted" mode the tenant has already obtained explicit consent so we
 * default all signals to "granted" immediately.
 */
function ga4Script(id: string, consentMode: "basic" | "granted"): string {
  const consentDefaults =
    consentMode === "granted"
      ? `gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'granted' });`
      : `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', wait_for_update: 500 });`;

  return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${consentDefaults}
gtag('config', '${id}');
`.trim();
}

/**
 * Build the GTM snippet (dataLayer init + GTM loader).
 * Container ID is validated server-side as /^GTM-[A-Z0-9]+$/.
 */
function gtmScript(id: string): string {
  return `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');
`.trim();
}

/**
 * Build the Meta Pixel base code.
 * Pixel ID is validated server-side as /^[0-9]{6,20}$/.
 */
function metaPixelScript(id: string): string {
  return `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
`.trim();
}

export interface AnalyticsScripts {
  /** Scripts to inject inside <head> (or at the top of <body>). */
  headScripts: ReactNode;
  /** Scripts to inject at the start of <body> (GTM noscript iframes etc). */
  bodyScripts: ReactNode;
}

/**
 * Returns React nodes for all enabled analytics trackers.
 * Returns empty arrays when injection is suppressed (preview or noindex).
 */
export function renderAnalyticsScripts(
  analytics: SiteAnalytics | null | undefined,
  opts: RenderAnalyticsOptions,
): AnalyticsScripts {
  const empty: AnalyticsScripts = { headScripts: null, bodyScripts: null };

  // Never inject in preview or noindex pages.
  if (opts.isPreview || opts.noIndex) return empty;

  if (!analytics) return empty;

  const { ga4MeasurementId, gtmContainerId, metaPixelId, consentMode = "basic" } =
    analytics;

  const hasGA4 = Boolean(ga4MeasurementId?.trim());
  const hasGTM = Boolean(gtmContainerId?.trim());
  const hasPixel = Boolean(metaPixelId?.trim());

  if (!hasGA4 && !hasGTM && !hasPixel) return empty;

  const scripts: ReactNode[] = [];

  if (hasGA4) {
    // External gtag.js loader
    scripts.push(
      createElement(Script, {
        key: "ga4-loader",
        src: `https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`,
        strategy: "afterInteractive" as const,
      }),
    );
    // Inline init snippet
    scripts.push(
      createElement(Script, {
        key: "ga4-init",
        id: "ga4-init",
        strategy: "afterInteractive" as const,
        dangerouslySetInnerHTML: {
          __html: ga4Script(ga4MeasurementId!, consentMode),
        },
      }),
    );
  }

  if (hasGTM) {
    scripts.push(
      createElement(Script, {
        key: "gtm-init",
        id: "gtm-init",
        strategy: "afterInteractive" as const,
        dangerouslySetInnerHTML: { __html: gtmScript(gtmContainerId!) },
      }),
    );
  }

  if (hasPixel) {
    scripts.push(
      createElement(Script, {
        key: "meta-pixel-init",
        id: "meta-pixel-init",
        strategy: "afterInteractive" as const,
        dangerouslySetInnerHTML: { __html: metaPixelScript(metaPixelId!) },
      }),
    );
  }

  return {
    headScripts: scripts,
    bodyScripts: null,
  };
}
