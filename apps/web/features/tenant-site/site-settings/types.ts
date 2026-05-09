export interface SiteSettings {
  siteName: string;
  tagline: string;
  timezone: string;
  language: string;
  address: string;
  phone: string;
  email: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "author" | "viewer";
  status: "active" | "pending";
  isYou?: boolean;
}

export interface BillingPlan {
  name: string;
  price: number;
  period: "month" | "year";
  renewsOn: string;
  isCurrent: boolean;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  isConnected: boolean;
  color: string;
}

export interface APIToken {
  id: string;
  name: string;
  token: string;
  scope: "read" | "write" | "sign";
  lastUsed: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
}

export interface LegalPage {
  id: string;
  name: string;
  updatedAt: string;
}

export interface PublishHistory {
  id: string;
  version: number;
  publishedBy: string;
  publishedAt: string;
  changes: string;
}
