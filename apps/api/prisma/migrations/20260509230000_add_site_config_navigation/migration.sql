-- Add navigation JSON field to SiteConfig
-- Stores: { primary: NavItem[], utility: NavItem[], footer: NavColumn[] }
-- NavItem = { id, label, href, target?, children? }
-- NavColumn = { id, title, items: NavItem[] }

ALTER TABLE "site_configs" ADD COLUMN "navigation" JSONB;
