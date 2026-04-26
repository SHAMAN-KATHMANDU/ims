-- CreateTable
CREATE TABLE "tenant_business_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "legal_name" VARCHAR(255),
    "display_name" VARCHAR(255),
    "tagline" VARCHAR(255),
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "email" TEXT,
    "phone" VARCHAR(40),
    "alternate_phone" VARCHAR(40),
    "website_url" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" VARCHAR(120),
    "state" VARCHAR(120),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(2),
    "map_url" TEXT,
    "pan_number" VARCHAR(20),
    "vat_number" VARCHAR(20),
    "registration_number" VARCHAR(40),
    "tax_id" VARCHAR(40),
    "default_currency" VARCHAR(8) NOT NULL DEFAULT 'NPR',
    "timezone" VARCHAR(64),
    "socials" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_business_profiles_tenant_id_key" ON "tenant_business_profiles"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_business_profiles" ADD CONSTRAINT "tenant_business_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
