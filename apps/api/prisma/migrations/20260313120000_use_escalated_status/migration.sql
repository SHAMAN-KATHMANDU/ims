-- Use status=ESCALATED instead of escalated boolean for clarity.
-- Backfill: rows with escalated=true become status=ESCALATED
UPDATE "password_reset_requests" SET status = 'ESCALATED' WHERE escalated = true;

-- Drop the redundant escalated column
ALTER TABLE "password_reset_requests" DROP COLUMN "escalated";
