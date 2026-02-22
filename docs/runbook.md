# Operations Runbook

## Secrets rotation

After removing `.env` from git history (or after a suspected or confirmed leak), rotate the following secrets.

1. **JWT_SECRET**
   - Generate a new value (e.g. 64-character random string).
   - Update in all environments (local `.env`, CI, staging/production env or secrets manager).
   - All existing JWTs and refresh tokens will be invalid; users must log in again.

2. **POSTGRES_PASSWORD**
   - Change the password in the database.
   - Update the same value in every place it is used: Docker Compose env, `.env`, and any deployment/CI secrets (e.g. `DATABASE_URL`).

3. **SEED_PLATFORM_ADMIN_PASSWORD**
   - Set a new password.
   - Either re-run the platform seed (if applicable) or update the platform admin user’s password in the database so it matches the new value.

Keep a secure record of the new values (e.g. in a secrets manager or secure vault); do not commit them to the repo.
