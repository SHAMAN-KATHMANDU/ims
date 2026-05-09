export interface NavItem {
  id: string;
  label: string;
  href: string;
  target?: "_blank";
  children?: NavItem[];
}

export interface NavColumn {
  id: string;
  title: string;
  items: NavItem[];
}

export interface NavigationConfig {
  primary: NavItem[];
  utility: NavItem[];
  footer: NavColumn[];
}

export type NavigationTab = "primary" | "utility" | "footer";
