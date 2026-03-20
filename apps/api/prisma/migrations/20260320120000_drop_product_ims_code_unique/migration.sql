-- Drop per-tenant unique constraint on product code so multiple products may share the same code.
DROP INDEX IF EXISTS "products_tenant_id_ims_code_key";
