-- =====================================================================
-- Phase F.2 — add WEBSITE_ORDER_NEW to the NotificationType enum
-- =====================================================================
-- Extends the NotificationType enum with a new variant for in-app
-- alerts fired when a guest places a cart order via /public/orders.
-- Additive only — existing notifications keep working unchanged.

ALTER TYPE "NotificationType" ADD VALUE 'WEBSITE_ORDER_NEW';
