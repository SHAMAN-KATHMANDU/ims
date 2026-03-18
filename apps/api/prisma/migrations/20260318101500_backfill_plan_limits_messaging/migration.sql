-- Messaging was added with DEFAULT false; align with product (Professional+).
UPDATE "plan_limits"
SET "messaging" = true
WHERE "tier" IN ('PROFESSIONAL', 'ENTERPRISE');

UPDATE "plan_limits"
SET "messaging" = false
WHERE "tier" = 'STARTER';
