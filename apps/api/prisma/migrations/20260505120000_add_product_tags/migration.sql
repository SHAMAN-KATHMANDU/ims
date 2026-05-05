-- CreateTable
CREATE TABLE "product_tags" (
    "tag_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "product_tag_links" (
    "product_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "product_tag_links_pkey" PRIMARY KEY ("product_id","tag_id")
);

-- CreateIndex
CREATE INDEX "product_tags_tenant_id_idx" ON "product_tags"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_tenant_id_name_key" ON "product_tags"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_links" ADD CONSTRAINT "product_tag_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tag_links" ADD CONSTRAINT "product_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "product_tags"("tag_id") ON DELETE CASCADE ON UPDATE CASCADE;
