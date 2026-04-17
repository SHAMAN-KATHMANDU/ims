-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "subtitle" VARCHAR(300),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collections" (
    "collection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("collection_id","product_id")
);

-- CreateIndex
CREATE INDEX "collections_tenant_id_is_active_sort_idx" ON "collections"("tenant_id", "is_active", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "collections_tenant_id_slug_key" ON "collections"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "product_collections_product_id_idx" ON "product_collections"("product_id");

-- CreateIndex
CREATE INDEX "product_collections_collection_id_position_idx" ON "product_collections"("collection_id", "position");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;
