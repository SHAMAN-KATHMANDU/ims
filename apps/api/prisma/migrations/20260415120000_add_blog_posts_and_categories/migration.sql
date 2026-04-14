-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body_markdown" TEXT NOT NULL,
    "hero_image_url" TEXT,
    "author_name" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "category_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "reading_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_categories_tenant_id_idx" ON "blog_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_tenant_id_slug_key" ON "blog_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "blog_posts_tenant_id_status_published_at_idx" ON "blog_posts"("tenant_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_tenant_id_category_id_idx" ON "blog_posts"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_tenant_id_slug_key" ON "blog_posts"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "blog_categories" ADD CONSTRAINT "blog_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
