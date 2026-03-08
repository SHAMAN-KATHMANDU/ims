# Product Page - Modular Structure

This directory contains a modular implementation of the Product page, broken down into smaller, focused components for better maintainability and code review.

## Structure

```
product/
├── index.tsx                    # Main ProductPage component (orchestrates everything)
├── types.ts                     # Shared TypeScript types
├── utils/
│   └── helpers.ts               # Helper functions (calculations, filtering, etc.)
├── components/
│   ├── ProductForm.tsx          # Product add/edit form wrapper with tabs
│   ├── CategoryForm.tsx         # Category add/edit form
│   ├── ProductTable.tsx         # Product listing table with search
│   ├── CategoryTable.tsx        # Category listing table
│   ├── DiscountsTab.tsx         # Discounts tab for main page
│   ├── form-tabs/
│   │   ├── GeneralTab.tsx       # General product info tab
│   │   ├── DimensionsTab.tsx    # Product dimensions tab
│   │   ├── VariationsTab.tsx    # Product variations tab
│   │   └── DiscountsTab.tsx     # Product discounts tab
│   └── dialogs/
│       ├── ProductDeleteDialog.tsx   # Product deletion confirmation
│       └── CategoryDeleteDialog.tsx  # Category deletion confirmation
└── README.md                    # This file
```

## Component Responsibilities

### Main Components

- **index.tsx**: Main orchestrator component that:
  - Manages all state (forms, dialogs, variations, discounts)
  - Handles data fetching (products, categories, discount types)
  - Coordinates between child components
  - Handles form submissions and mutations

### Form Components

- **ProductForm.tsx**: Wrapper component for product add/edit dialog
  - Manages tab navigation (General, Dimensions, Variations, Discounts)
  - Handles Next/Previous button logic
  - Renders form tabs and navigation buttons

- **CategoryForm.tsx**: Simple form for category add/edit
  - Handles category creation and updates

### Table Components

- **ProductTable.tsx**: Displays products in a table
  - Includes search functionality
  - Shows expandable rows for variations and discounts
  - Handles role-based visibility (cost price vs discounted prices)

- **CategoryTable.tsx**: Displays categories in a table
  - Simple table with edit/delete actions

### Form Tabs

- **GeneralTab.tsx**: Basic product information (IMS Code, Name, Category, Description, Prices)
- **DimensionsTab.tsx**: Product dimensions (Length, Breadth, Height, Weight)
- **VariationsTab.tsx**: Product variations with photos
- **DiscountsTab.tsx**: Product discounts with date pickers and toggle switches

### Dialog Components

- **ProductDeleteDialog.tsx**: Confirmation dialog for product deletion
- **CategoryDeleteDialog.tsx**: Confirmation dialog for category deletion

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single, clear responsibility
2. **Reusability**: Components can be easily reused or modified independently
3. **Testability**: Smaller components are easier to test
4. **Maintainability**: Changes to one feature don't affect others
5. **Code Review**: Easier to review smaller, focused files
6. **Type Safety**: Shared types ensure consistency across components

## Usage

The main `ProductPage` component is imported and used in:

```
apps/web/app/[workspace]/products/page.tsx
```

The component automatically handles:

- Data fetching via TanStack Query hooks
- Form state management
- Dialog state management
- Mutation handling
- Error handling and toast notifications
