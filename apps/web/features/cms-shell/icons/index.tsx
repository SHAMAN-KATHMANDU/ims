import { LucideProps } from "lucide-react";
import {
  Home,
  FileText,
  BookOpen,
  Blocks,
  Code2,
  Image,
  Grid3x3,
  Gift,
  Navigation as NavigationIcon,
  Palette,
  Globe,
  SearchX,
  Edit,
  Settings,
  Bell,
  ExternalLink,
  Search,
  Plus,
  Command,
  Gauge,
} from "lucide-react";

const icons = {
  home: Home,
  pages: FileText,
  blog: BookOpen,
  blocks: Blocks,
  snippets: Code2,
  media: Image,
  collections: Grid3x3,
  offers: Gift,
  navigation: NavigationIcon,
  design: Palette,
  domains: Globe,
  seo: SearchX,
  forms: Edit,
  settings: Settings,
  bell: Bell,
  external: ExternalLink,
  search: Search,
  plus: Plus,
  cmd: Command,
  gauge: Gauge,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 16,
  ...props
}: { name: IconName; size?: number } & LucideProps) {
  const IconComponent = icons[name];
  return <IconComponent size={size} {...props} />;
}

export function getIconComponent(name: IconName) {
  return icons[name];
}
