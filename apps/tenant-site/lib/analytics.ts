/**
 * Server-side analytics script rendering for the tenant-site app.
 *
 * renderAnalyticsScripts() returns React elements (built with React.createElement,
 * NOT JSX — this file must stay importable from RSC without a JSX transform that
 * adds "use client") that inject GA4, GTM, and/or Meta Pixel tags into <head>.
 *
 * Safety invariants:
 *   - NEVER injects scripts on /preview/* routes (isPreview = true)
 *   - NEVER injects scripts when robots meta says "noindex" (noIndex = true)
 *   - Honors Google Consent Mode v2 (consentMode "basic" = denied by default)
 */

import React from "react";
import Script from "next/script";
import type { PublicSiteAnalytics } from "./api";

export interface RenderAnalyticsOptions {
  /** True when the request is for a /preview/* route. */
  isPreview: boolean;
  /** True when the site's SEO robots setting contains "noindex". */
  noIndex: boolean;
}

export interface AnalyticsScripts {
  /** Scripts to render inside <head>. Null when no trackers are configured. */
  headScripts: React.ReactNode;
  /** Scripts to render at end of <body> (currently always null). */
  bodyScripts: null;
}

/**
 * Build the analytics script nodes for a published tenant site.
 *
 * Returns `{ headScripts: null, bodyScripts: null }` when:
 *   - the request is a preview route
 *   - the page is noindex
 *   - no analytics config is set
 *
 * Otherwise returns a React Fragment containing Script elements for each
 * configured tracker.
 */
export function renderAnalyticsScripts(
  analytics: PublicSiteAnalytics | null | undefined,
  opts: RenderAnalyticsOptions,
): AnalyticsScripts {
  const none: AnalyticsScripts = { headScripts: null, bodyScripts: null };

  // Safety guards — never pollute preview/noindex pages with analytics
  if (opts.isPreview || opts.noIndex) return none;
  if (!analytics) return none;

  const { ga4MeasurementId, gtmContainerId, metaPixelId, consentMode } =
    analytics;

  const scripts: React.ReactElement[] = [];

  // ——— Google Analytics 4 ———
  if (ga4MeasurementId) {
    const denied = consentMode !== "granted";

    // Consent Mode v2 defaults (must run before gtag.js loads)
    const consentInit = denied
      ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
        `gtag('consent','default',{` +
        `'analytics_storage':'denied',` +
        `'ad_storage':'denied',` +
        `'ad_user_data':'denied',` +
        `'ad_personalization':'denied',` +
        `'wait_for_update':500` +
        `});`
      : `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
        `gtag('consent','default',{` +
        `'analytics_storage':'granted',` +
        `'ad_storage':'granted',` +
        `'ad_user_data':'granted',` +
        `'ad_personalization':'granted'` +
        `});`;

    scripts.push(
      React.createElement(Script, {
        key: "ga4-consent",
        id: "ga4-consent-init",
        strategy: "afterInteractive",
        dangerouslySetInnerHTML: { __html: consentInit },
      }),
    );

    // gtag.js loader
    scripts.push(
      React.createElement(Script, {
        key: "ga4-loader",
        src: `https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`,
        strategy: "afterInteractive",
      }),
    );

    // GA4 config
    const ga4Init =
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config','${ga4MeasurementId}');`;

    scripts.push(
      React.createElement(Script, {
        key: "ga4-config",
        id: "ga4-config",
        strategy: "afterInteractive",
        dangerouslySetInnerHTML: { __html: ga4Init },
      }),
    );
  }

  // ——— Google Tag Manager ———
  if (gtmContainerId) {
    const gtmSnippet =
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
      `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
      `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=` +
      `'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
      `})(window,document,'script','dataLayer','${gtmContainerId}');`;

    scripts.push(
      React.createElement(Script, {
        key: "gtm",
        id: "gtm-init",
        strategy: "afterInteractive",
        dangerouslySetInnerHTML: { __html: gtmSnippet },
      }),
    );
  }

  // ——— Meta Pixel ———
  if (metaPixelId) {
    const pixelSnippet =
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){` +
      `n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
      `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';` +
      `n.queue=[];t=b.createElement(e);t.async=!0;` +
      `t.src=v;s=b.getElementsByTagName(e)[0];` +
      `s.parentNode.insertBefore(t,s)}(window,document,'script',` +
      `'https://connect.facebook.net/en_US/fbevents.js');` +
      `fbq('init','${metaPixelId}');fbq('track','PageView');`;

    scripts.push(
      React.createElement(Script, {
        key: "meta-pixel",
        id: "meta-pixel-init",
        strategy: "afterInteractive",
        dangerouslySetInnerHTML: { __html: pixelSnippet },
      }),
    );
  }

  if (scripts.length === 0) return none;

  return {
    headScripts: React.createElement(React.Fragment, null, ...scripts),
    bodyScripts: null,
  };
}
