-- EAV-style variation attributes: attribute types, values, and variation attributes.
-- ProductVariation gets tenant_id, sku (unique per tenant), optional price overrides.

-- CreateTable: attribute_types
CREATE TABLE "attribute_types" (
    "attribute_type_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_types_pkey" PRIMARY KEY ("attribute_type_id")
);

-- CreateTable: attribute_values
CREATE TABLE "attribute_values" (
    "attribute_value_id" TEXT NOT NULL,
    "attribute_type_id" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("attribute_value_id")
);

-- CreateTable: product_attribute_types
CREATE TABLE "product_attribute_types" (
    "product_id" TEXT NOT NULL,
    "attribute_type_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attribute_types_pkey" PRIMARY KEY ("product_id","attribute_type_id")
);

-- CreateTable: product_variation_attributes
CREATE TABLE "product_variation_attributes" (
    "variation_id" TEXT NOT NULL,
    "attribute_type_id" TEXT NOT NULL,
    "attribute_value_id" TEXT NOT NULL,

    CONSTRAINT "product_variation_attributes_pkey" PRIMARY KEY ("variation_id","attribute_type_id")
);

-- AlterTable: product_variations - add new columns (tenant_id nullable first for backfill)
ALTER TABLE "product_variations" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "product_variations" ADD COLUMN "sku" VARCHAR(100);
ALTER TABLE "product_variations" ADD COLUMN "cost_price_override" DECIMAL(10,2);
ALTER TABLE "product_variations" ADD COLUMN "mrp_override" DECIMAL(10,2);
ALTER TABLE "product_variations" ADD COLUMN "final_sp_override" DECIMAL(10,2);
ALTER TABLE "product_variations" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill tenant_id from products
UPDATE "product_variations" pv
SET "tenant_id" = p."tenant_id"
FROM "products" p
WHERE pv."product_id" = p."product_id";

-- Set tenant_id NOT NULL and make color nullable
ALTER TABLE "product_variations" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "product_variations" ALTER COLUMN "color" DROP NOT NULL;

-- Drop old unique constraint on (product_id, color)
DROP INDEX IF EXISTS "product_variations_product_id_color_key";

-- CreateIndex: unique (tenant_id, sku) on product_variations
CREATE UNIQUE INDEX "product_variations_tenant_id_sku_key" ON "product_variations"("tenant_id", "sku");

-- CreateIndex: attribute_types tenant + code
CREATE UNIQUE INDEX "attribute_types_tenant_id_code_key" ON "attribute_types"("tenant_id", "code");

-- CreateIndex: attribute_values type + value
CREATE UNIQUE INDEX "attribute_values_attribute_type_id_value_key" ON "attribute_values"("attribute_type_id", "value");

-- AddForeignKey: attribute_types -> tenants
ALTER TABLE "attribute_types" ADD CONSTRAINT "attribute_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: attribute_values -> attribute_types
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_type_id_fkey" FOREIGN KEY ("attribute_type_id") REFERENCES "attribute_types"("attribute_type_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: product_attribute_types -> products, attribute_types
ALTER TABLE "product_attribute_types" ADD CONSTRAINT "product_attribute_types_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_types" ADD CONSTRAINT "product_attribute_types_attribute_type_id_fkey" FOREIGN KEY ("attribute_type_id") REFERENCES "attribute_types"("attribute_type_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: product_variation_attributes
ALTER TABLE "product_variation_attributes" ADD CONSTRAINT "product_variation_attributes_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("variation_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variation_attributes" ADD CONSTRAINT "product_variation_attributes_attribute_type_id_fkey" FOREIGN KEY ("attribute_type_id") REFERENCES "attribute_types"("attribute_type_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variation_attributes" ADD CONSTRAINT "product_variation_attributes_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("attribute_value_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: product_variations -> tenants
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
