-- CreateEnum
CREATE TYPE "gift_card_status" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'VOIDED');

-- CreateTable
CREATE TABLE "gift_cards" (
    "gift_card_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "purchaser_id" TEXT,
    "recipient_email" VARCHAR(255),
    "expires_at" TIMESTAMP(3),
    "status" "gift_card_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("gift_card_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_tenant_id_code_key" ON "gift_cards"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "gift_cards_tenant_id_status_idx" ON "gift_cards"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
