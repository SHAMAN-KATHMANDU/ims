/**
 * Authentication context attached to request after requireAuth middleware.
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}
