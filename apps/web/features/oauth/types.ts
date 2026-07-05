/** Display info for a pending OAuth authorization request (GET /oauth/consent/:id). */
export interface ConsentDetails {
  clientName: string;
  scope: string;
  redirectHost: string;
}

/** Result of an approve/deny decision (POST /oauth/consent/:id/decision). */
export interface ConsentDecisionResult {
  /** Fully-qualified client redirect URI carrying ?code= or ?error=. */
  redirectTo: string;
}
