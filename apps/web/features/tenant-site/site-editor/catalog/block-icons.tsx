/**
 * Lucide React icons for each block kind.
 *
 * Maps BlockKind to icon components for use in the palette and tree outline.
 */

import type { BlockKind } from "@repo/shared";
import {
  Layout,
  Columns,
  Grid3x3,
  Grid2x2,
  Heading1,
  Type,
  FileText,
  Image as ImageIcon,
  Square,
  Rows,
  Package,
  ShoppingCart,
  Tag,
  Layers,
  Quote,
  Users,
  MessageSquare,
  Mail,
  HelpCircle,
  Zap,
  Eye,
  Play,
  BookOpen,
  Navigation2,
  Settings2,
  Copy,
  Gift,
  Clock,
  Ruler,
  Table,
  ChevronRight,
  Share2,
  CreditCard,
  Copy as Copyright,
  Receipt,
  User,
  DollarSign,
  Code2,
  Code,
} from "lucide-react";

export function getBlockIcon(kind: BlockKind): React.ReactNode {
  const iconProps: React.SVGProps<SVGSVGElement> & {
    size?: string | number;
    className?: string;
  } = { size: 16, className: "text-muted-foreground" };

  const iconMap: Record<BlockKind, React.ReactNode> = {
    // Layout
    section: <Layout {...iconProps} />,
    row: <Rows {...iconProps} />,
    columns: <Columns {...iconProps} />,
    "css-grid": <Grid3x3 {...iconProps} />,

    // Content
    heading: <Heading1 {...iconProps} />,
    "rich-text": <Type {...iconProps} />,
    image: <ImageIcon {...iconProps} />,
    button: <Square {...iconProps} />,
    spacer: <Square {...iconProps} />,
    divider: <Rows {...iconProps} />,
    "markdown-body": <FileText {...iconProps} />,
    embed: <Code2 {...iconProps} />,
    video: <Play {...iconProps} />,
    accordion: <Layers {...iconProps} />,
    gallery: <Grid2x2 {...iconProps} />,
    tabs: <Layout {...iconProps} />,
    form: <Layout {...iconProps} />,
    "custom-html": <Code {...iconProps} />,
    "empty-state": <Eye {...iconProps} />,

    // Commerce
    hero: <ImageIcon {...iconProps} />,
    "product-grid": <ShoppingCart {...iconProps} />,
    "category-tiles": <Tag {...iconProps} />,
    "product-listing": <Layout {...iconProps} />,
    "product-filters": <Settings2 {...iconProps} />,
    "trust-strip": <Users {...iconProps} />,
    "story-split": <Layout {...iconProps} />,
    "bento-showcase": <Grid3x3 {...iconProps} />,
    "stats-band": <Zap {...iconProps} />,
    newsletter: <Mail {...iconProps} />,
    "policy-strip": <FileText {...iconProps} />,
    "contact-block": <MessageSquare {...iconProps} />,
    faq: <HelpCircle {...iconProps} />,
    testimonials: <Quote {...iconProps} />,
    "logo-cloud": <Package {...iconProps} />,
    "collection-cards": <Grid2x2 {...iconProps} />,
    "announcement-bar": <Zap {...iconProps} />,
    "bundle-spotlight": <Package {...iconProps} />,
    "gift-card-redeem": <Gift {...iconProps} />,

    // Blog
    "blog-list": <BookOpen {...iconProps} />,

    // PDP
    "pdp-gallery": <Grid2x2 {...iconProps} />,
    "pdp-buybox": <ShoppingCart {...iconProps} />,
    "pdp-details": <FileText {...iconProps} />,
    "pdp-related": <Tag {...iconProps} />,
    "reviews-list": <MessageSquare {...iconProps} />,
    fbt: <Package {...iconProps} />,
    "recently-viewed": <Clock {...iconProps} />,
    "size-guide": <Ruler {...iconProps} />,
    "product-comparison": <Table {...iconProps} />,
    lookbook: <ImageIcon {...iconProps} />,
    breadcrumbs: <ChevronRight {...iconProps} />,

    // Header
    "nav-bar": <Navigation2 {...iconProps} />,
    "logo-mark": <ImageIcon {...iconProps} />,
    "utility-bar": <Settings2 {...iconProps} />,

    // Footer
    "footer-columns": <Columns {...iconProps} />,
    "social-links": <Share2 {...iconProps} />,
    "payment-icons": <CreditCard {...iconProps} />,
    "copyright-bar": <Copyright {...iconProps} />,

    // Cart / checkout
    "cart-line-items": <ShoppingCart {...iconProps} />,
    "order-summary": <Receipt {...iconProps} />,
    "account-bar": <User {...iconProps} />,
    "checkout-form": <CreditCard {...iconProps} />,
    "price-tiers": <DollarSign {...iconProps} />,

    // Phase 5
    "snippet-ref": <Copy {...iconProps} />,
  };

  return iconMap[kind] || <Square {...iconProps} />;
}
