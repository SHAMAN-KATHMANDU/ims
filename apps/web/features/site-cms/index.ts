// UI Primitives
export {
  Pill,
  StatusDot,
  StatusPill,
  Btn,
  Card,
  Hr,
  Avatar,
  Section,
  Field,
  Input,
  TextArea,
  Select,
  Toggle,
  Slider,
  Segmented,
  Meter,
} from "./components/ui";

// Components
export { ShellLayout } from "./components/ShellLayout";
export { Sidebar } from "./components/Sidebar";
export { Topbar } from "./components/Topbar";
export { CommandPalette } from "./components/CommandPalette";
export { RoutePlaceholder } from "./components/RoutePlaceholder";

// Hooks
export { useTheme } from "./hooks/use-theme";
export {
  BreadcrumbsProvider,
  useBreadcrumbs,
  useSetBreadcrumbs,
  useHideCmsTopbar,
} from "./hooks/use-breadcrumbs";
export { useRecentRoutes } from "./hooks/use-recent-routes";
