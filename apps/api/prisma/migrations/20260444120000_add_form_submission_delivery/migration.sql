-- AlterTable: add delivery-tracking columns to form_submissions
ALTER TABLE "form_submissions"
  ADD COLUMN "delivered_at"   TIMESTAMPTZ,
  ADD COLUMN "last_error"     TEXT,
  ADD COLUMN "attempt_count"  INTEGER NOT NULL DEFAULT 0;
