/*
  Warnings:

  - The primary key for the `products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ims_code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date_modified` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ims_code` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mrp` to the `products` table without a default value. This is not possible if the table is not empty.
  - The required column `product_id` was added to the `products` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `product_name` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" DROP CONSTRAINT "products_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
DROP COLUMN "name",
DROP COLUMN "price",
DROP COLUMN "updatedAt",
ADD COLUMN     "breadth" DECIMAL(10,2),
ADD COLUMN     "category_id" TEXT NOT NULL,
ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "date_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date_modified" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "height" DECIMAL(10,2),
ADD COLUMN     "ims_code" VARCHAR(100) NOT NULL,
ADD COLUMN     "length" DECIMAL(10,2),
ADD COLUMN     "mrp" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "product_id" TEXT NOT NULL,
ADD COLUMN     "product_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "weight" DECIMAL(10,2),
ADD CONSTRAINT "products_pkey" PRIMARY KEY ("product_id");

-- CreateTable
CREATE TABLE "categories" (
    "category_id" TEXT NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "product_variations" (
    "variation_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color" VARCHAR(100) NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variations_pkey" PRIMARY KEY ("variation_id")
);

-- CreateTable
CREATE TABLE "variation_photos" (
    "photo_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "photo_url" VARCHAR(500) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variation_photos_pkey" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "discount_types" (
    "discount_type_id" TEXT NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_types_pkey" PRIMARY KEY ("discount_type_id")
);

-- CreateTable
CREATE TABLE "product_discounts" (
    "discount_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "discount_type_id" TEXT NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_discounts_pkey" PRIMARY KEY ("discount_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_category_name_key" ON "categories"("category_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variations_product_id_color_key" ON "product_variations"("product_id", "color");

-- CreateIndex
CREATE UNIQUE INDEX "discount_types_type_name_key" ON "discount_types"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_discounts_product_id_discount_type_id_key" ON "product_discounts"("product_id", "discount_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_ims_code_key" ON "products"("ims_code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variation_photos" ADD CONSTRAINT "variation_photos_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("variation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_discount_type_id_fkey" FOREIGN KEY ("discount_type_id") REFERENCES "discount_types"("discount_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
