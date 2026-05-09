export interface NavLink {
  id: string;
  label: string;
  href: string;
  children?: NavLink[];
}

export interface FooterColumn {
  id: string;
  title: string;
  links: NavLink[];
}

export interface AnnouncementBar {
  id: string;
  message: string;
  href?: string;
  style: "dark" | "soft" | "accent";
  dismissible: boolean;
  showOnlyHome: boolean;
  activeFrom?: string;
  activeTo?: string;
}

export interface NavigationData {
  primaryNav: NavLink[];
  footer: FooterColumn[];
  announcementBar: AnnouncementBar | null;
  mobileMenuCustom: boolean;
  mobileMenuItems?: NavLink[];
  logo?: {
    url: string;
    alt: string;
  };
}
