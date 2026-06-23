/**
 * Resolves the per-tenant Meta credentials needed for a Graph call.
 *
 * Credentials are bring-your-own-app, stored encrypted by the meta-integration
 * settings module. This layer turns a tenant + an optional page/ad-account
 * selector into a concrete { token, appSecret, version }. When the selector is
 * ambiguous or missing it throws an error carrying `availableOptions`, which
 * mcpErrorResponse surfaces so the model can call meta_page_list /
 * meta_ad_accounts_list and retry.
 */

import { MetaCredentialKind } from "@prisma/client";
import { createError, type AppError } from "@/middlewares/errorHandler";
import { decrypt } from "@/utils/encryption";
import metaIntegrationRepository from "@/modules/meta-integration/meta-integration.repository";
import { DEFAULT_GRAPH_API_VERSION } from "./meta-graph.client";

export interface ResolvedMetaToken {
  /** Decrypted access token (Page token or Ads system-user token). */
  token: string;
  /** Decrypted App Secret for appsecret_proof, if the tenant configured one. */
  appSecret?: string;
  /** Graph API version to use (per-tenant override or the code default). */
  version: string;
  /** The selected page id (PAGE) or ad-account id without "act_" (ADS). */
  externalId: string;
  /** Human label of the selected credential. */
  name: string;
}

type AppErrorWithOptions = AppError & {
  availableOptions?: Array<{ id: string; name: string }>;
  referenceKind?: string;
};

function ambiguousError(
  kind: MetaCredentialKind,
  options: Array<{ id: string; name: string }>,
  selectorProvided: boolean,
): AppErrorWithOptions {
  const label = kind === MetaCredentialKind.PAGE ? "page" : "ad account";
  const param = kind === MetaCredentialKind.PAGE ? "pageId" : "adAccountId";
  const listTool =
    kind === MetaCredentialKind.PAGE
      ? "meta_page_list"
      : "meta_ad_accounts_list";
  const msg = selectorProvided
    ? `No connected ${label} matches that ${param}. Use ${listTool} to see the configured options.`
    : `Multiple ${label}s are connected — pass ${param} to choose one (see ${listTool}).`;
  const err = createError(
    msg,
    400,
    "META_AMBIGUOUS_SELECTOR",
  ) as AppErrorWithOptions;
  err.availableOptions = options;
  err.referenceKind = param;
  return err;
}

/** App-level context (App Secret + version) even when no token is required. */
export async function resolveAppContext(
  tenantId: string,
): Promise<{ appSecret?: string; version: string; appId?: string }> {
  const integration = await metaIntegrationRepository.getIntegration(tenantId);
  return {
    appSecret: integration?.appSecretEnc
      ? decrypt(integration.appSecretEnc)
      : undefined,
    version: integration?.graphApiVersion || DEFAULT_GRAPH_API_VERSION,
    appId: integration?.appId ?? undefined,
  };
}

async function resolve(
  tenantId: string,
  kind: MetaCredentialKind,
  selector: string | undefined,
): Promise<ResolvedMetaToken> {
  const integration = await metaIntegrationRepository.getIntegration(tenantId);
  const version = integration?.graphApiVersion || DEFAULT_GRAPH_API_VERSION;
  const appSecret = integration?.appSecretEnc
    ? decrypt(integration.appSecretEnc)
    : undefined;

  const creds = await metaIntegrationRepository.getCredentialsByKind(
    tenantId,
    kind,
  );

  if (creds.length === 0) {
    const label = kind === MetaCredentialKind.PAGE ? "Facebook Page" : "Ads";
    throw createError(
      `No ${label} access token is configured. Add one in Settings → Facebook / Meta.`,
      400,
      "META_NOT_CONFIGURED",
    );
  }

  const normalizedSelector =
    kind === MetaCredentialKind.ADS && selector
      ? selector.replace(/^act_/i, "").trim()
      : selector?.trim();

  const options = creds.map((c) => ({ id: c.externalId, name: c.name }));

  let chosen = creds[0];
  if (normalizedSelector) {
    const match = creds.find((c) => c.externalId === normalizedSelector);
    if (!match) throw ambiguousError(kind, options, true);
    chosen = match;
  } else {
    const defaultId =
      kind === MetaCredentialKind.PAGE
        ? integration?.defaultPageId
        : integration?.defaultAdAccountId;
    if (defaultId) {
      const match = creds.find((c) => c.externalId === defaultId);
      if (match) chosen = match;
    } else if (creds.length > 1) {
      throw ambiguousError(kind, options, false);
    }
  }

  return {
    token: decrypt(chosen.accessTokenEnc),
    appSecret,
    version,
    externalId: chosen.externalId,
    name: chosen.name,
  };
}

export function resolvePageToken(
  tenantId: string,
  opts: { pageId?: string } = {},
): Promise<ResolvedMetaToken> {
  return resolve(tenantId, MetaCredentialKind.PAGE, opts.pageId);
}

export function resolveAdsToken(
  tenantId: string,
  opts: { adAccountId?: string } = {},
): Promise<ResolvedMetaToken> {
  return resolve(tenantId, MetaCredentialKind.ADS, opts.adAccountId);
}
