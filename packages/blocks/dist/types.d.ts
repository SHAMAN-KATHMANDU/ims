import type { ComponentType, ReactNode } from "react";
import type { BlockNode } from "@repo/shared";
/**
 * Block data context — shared data available to all blocks during rendering.
 * This includes sample/mock data for preview modes and real data for production.
 */
export interface BlockDataContext {
    site?: {
        locale?: string | null;
        currency?: string;
        /**
         * Editor-managed navigation. When present, NavBarBlock and footer
         * blocks render this in preference to their own per-block items
         * prop, so a Navigation-tab edit propagates to every header.
         */
        navigation?: {
            primary?: Array<{
                id: string;
                label: string;
                href: string;
            }>;
            utility?: Array<{
                id: string;
                label: string;
                href: string;
            }>;
            footer?: Array<{
                id: string;
                title: string;
                items: Array<{
                    id: string;
                    label: string;
                    href: string;
                }>;
            }>;
        } | null;
    } | null;
    products?: Array<{
        id: string;
        name: string;
        price: number | string;
        image?: string;
        sku?: string;
        stock?: number;
        images?: string[];
        description?: string;
    }>;
    categories?: Array<{
        id: string;
        name: string;
        image?: string;
    }>;
    navPages?: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
    blogPosts?: Array<{
        id: string;
        title: string;
        slug: string;
        image?: string;
        excerpt?: string;
    }>;
    /** PDP scope — the product whose detail page is being rendered. */
    activeProduct?: {
        id: string;
        name: string;
        price: number | string;
        image?: string;
        sku?: string;
        stock?: number;
        images?: string[];
        description?: string;
    } | null;
    /** Currently-active promo codes, surfaced by PromoCardsBlock on /offers. */
    promos?: Array<{
        id: string;
        code: string;
        description?: string | null;
        valueType: "PERCENT" | "FIXED" | string;
        value: number | string;
        validFrom?: string | null;
        validTo?: string | null;
    }>;
    [key: string]: unknown;
}
export interface BlockComponentProps<P = unknown, D = BlockDataContext> {
    node: BlockNode;
    props: P;
    dataContext: D;
    children?: ReactNode;
}
export type BlockComponent = ComponentType<BlockComponentProps<any, any>>;
export interface BlockRegistryEntry {
    component: BlockComponent;
    /** When true, the block renders its own `children`. */
    container?: boolean;
}
//# sourceMappingURL=types.d.ts.map