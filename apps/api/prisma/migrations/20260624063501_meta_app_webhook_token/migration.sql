-- AlterTable
ALTER TABLE "meta_integrations" ADD COLUMN     "webhook_verify_token" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "meta_integrations_webhook_verify_token_key" ON "meta_integrations"("webhook_verify_token");
