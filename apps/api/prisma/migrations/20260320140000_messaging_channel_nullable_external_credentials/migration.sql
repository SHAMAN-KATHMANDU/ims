-- Expand-contract: allow pending manual setup (verify token only) before page id / credentials exist.
-- PostgreSQL only. SQL Server uses different syntax (e.g. ALTER COLUMN ... NULL); this project datasource is PostgreSQL.

ALTER TABLE "messaging_channels" ALTER COLUMN "external_id" DROP NOT NULL;
ALTER TABLE "messaging_channels" ALTER COLUMN "credentials_enc" DROP NOT NULL;

CREATE UNIQUE INDEX "messaging_channels_webhook_verify_token_key" ON "messaging_channels"("webhook_verify_token");
