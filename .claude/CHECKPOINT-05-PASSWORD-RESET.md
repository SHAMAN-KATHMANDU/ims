# Checkpoint 05 — Password Reset Request System

**Commit:** (pending)
**Status:** DONE
**Tests:** PASS
**Type check:** PASS

## What was done
- Added PasswordResetStatus enum and PasswordResetRequest model to Prisma
- Migration: add-password-reset-requests
- Auth: ForgotPasswordSchema, requestPasswordReset, POST /auth/forgot-password (public)
- Users: getPasswordResetRequests, approveResetRequest, escalateResetRequest, rejectResetRequest (superAdmin)
- Platform: getPlatformResetRequests, approvePlatformResetRequest (platformAdmin)
- Frontend: ForgotPasswordPage, link in LoginForm, ForgotPasswordSchema
- Frontend: PasswordResetRequestsPage (superadmin), PlatformResetRequestsPage (platform admin)
- Routes: /[workspace]/forgot-password, settings/password-reset, platform/password-resets
- Sidebar: Password Reset Requests (superAdmin), Password Resets (platformAdmin)
- isProtectedPath: forgot-password added to public paths

## What's next
- Step 2.2: Error report status changes platform-admin-only
