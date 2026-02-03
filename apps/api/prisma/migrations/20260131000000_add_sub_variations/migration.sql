-- CreateTable
CREATE TABLE "product_sub_variations" (
    "sub_variation_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sub_variations_pkey" PRIMARY KEY ("sub_variation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sub_variations_variation_id_name_key" ON "product_sub_variations"("variation_id", "name");

-- AddForeignKey
ALTER TABLE "product_sub_variations" ADD CONSTRAINT "product_sub_variations_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("variation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: location_inventory - add sub_variation_id
ALTER TABLE "location_inventory" ADD COLUMN "sub_variation_id" TEXT;

-- DropIndex
DROP INDEX "location_inventory_location_id_variation_id_key";

-- CreateIndex: unique (location_id, variation_id, sub_variation_id)
CREATE UNIQUE INDEX "location_inventory_location_id_variation_id_sub_variation_id_key" ON "location_inventory"("location_id", "variation_id", "sub_variation_id");

-- AddForeignKey
ALTER TABLE "location_inventory" ADD CONSTRAINT "location_inventory_sub_variation_id_fkey" FOREIGN KEY ("sub_variation_id") REFERENCES "product_sub_variations"("sub_variation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: sale_items - add sub_variation_id
ALTER TABLE "sale_items" ADD COLUMN "sub_variation_id" TEXT;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sub_variation_id_fkey" FOREIGN KEY ("sub_variation_id") REFERENCES "product_sub_variations"("sub_variation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: transfer_items - add sub_variation_id
ALTER TABLE "transfer_items" ADD COLUMN "sub_variation_id" TEXT;

-- DropIndex
DROP INDEX "transfer_items_transfer_id_variation_id_key";

-- CreateIndex: unique (transfer_id, variation_id, sub_variation_id)
CREATE UNIQUE INDEX "transfer_items_transfer_id_variation_id_sub_variation_id_key" ON "transfer_items"("transfer_id", "variation_id", "sub_variation_id");

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_sub_variation_id_fkey" FOREIGN KEY ("sub_variation_id") REFERENCES "product_sub_variations"("sub_variation_id") ON DELETE RESTRICT ON UPDATE CASCADE;
