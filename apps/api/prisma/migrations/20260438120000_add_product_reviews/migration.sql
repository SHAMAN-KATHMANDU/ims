-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "product_reviews" (
    "product_review_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "author_name" VARCHAR(120),
    "author_email" VARCHAR(255),
    "submitted_ip" VARCHAR(64),
    "status" "review_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("product_review_id")
);

-- CreateIndex
CREATE INDEX "product_reviews_tenant_id_idx" ON "product_reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_status_idx" ON "product_reviews"("product_id", "status");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;
