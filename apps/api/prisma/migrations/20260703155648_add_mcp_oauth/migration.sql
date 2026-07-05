-- AlterTable
ALTER TABLE "mcp_tokens" ADD COLUMN     "oauth_client_id" TEXT;

-- CreateTable
CREATE TABLE "oauth_clients" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT,
    "client_name" TEXT,
    "redirect_uris" TEXT[],
    "grant_types" TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token']::TEXT[],
    "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'none',
    "scope" TEXT NOT NULL DEFAULT 'mcp',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_authorization_requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "state" TEXT,
    "scope" TEXT NOT NULL,
    "resource" TEXT,
    "code_challenge" TEXT NOT NULL,
    "code" TEXT,
    "code_used_at" TIMESTAMP(3),
    "tenant_id" TEXT,
    "user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_client_id_key" ON "oauth_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_requests_code_key" ON "oauth_authorization_requests"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_requests_expires_at_idx" ON "oauth_authorization_requests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_refresh_tokens_token_hash_key" ON "oauth_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "oauth_refresh_tokens_family_id_idx" ON "oauth_refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "oauth_refresh_tokens_tenant_id_user_id_idx" ON "oauth_refresh_tokens"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "mcp_tokens_oauth_client_id_idx" ON "mcp_tokens"("oauth_client_id");

-- AddForeignKey
ALTER TABLE "oauth_authorization_requests" ADD CONSTRAINT "oauth_authorization_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
