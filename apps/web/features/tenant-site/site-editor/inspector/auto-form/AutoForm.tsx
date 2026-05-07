"use client";

import { useMemo, type ReactNode } from "react";
import { z } from "zod";
import { StringField } from "./fields/StringField";
import { TextAreaField } from "./fields/TextAreaField";
import { NumberField } from "./fields/NumberField";
import { BooleanField } from "./fields/BooleanField";
import { EnumField } from "./fields/EnumField";
import { ColorField } from "./fields/ColorField";
import { SliderField } from "./fields/SliderField";
import { ArrayOfStringsField } from "./fields/ArrayOfStringsField";
import { JsonFallbackField } from "./fields/JsonFallbackField";
import { ProductPicker } from "./pickers/ProductPicker";
import { CategoryPicker } from "./pickers/CategoryPicker";
import { MediaPicker } from "./pickers/MediaPicker";
import { PagePicker } from "./pickers/PagePicker";
import { IconPicker } from "./pickers/IconPicker";
import { getFieldOverride, type FieldOverride } from "../inspector-overrides";
import { NavMenuBuilder } from "../widgets/NavMenuBuilder";
import { FooterColumnsBuilder } from "../widgets/FooterColumnsBuilder";
import { FormFieldsBuilder } from "../widgets/FormFieldsBuilder";
import { GalleryBuilder } from "../widgets/GalleryBuilder";
import { LookbookPinsBuilder } from "../widgets/LookbookPinsBuilder";
import { SizeGuideMatrixBuilder } from "../widgets/SizeGuideMatrixBuilder";
import { CollectionCardsBuilder } from "../widgets/CollectionCardsBuilder";
import { PriceTiersBuilder } from "../widgets/PriceTiersBuilder";
import { AccordionItemsBuilder } from "../widgets/AccordionItemsBuilder";
import { TabsItemsBuilder } from "../widgets/TabsItemsBuilder";
import { TestimonialsBuilder } from "../widgets/TestimonialsBuilder";
import { FaqBuilder } from "../widgets/FaqBuilder";
import { BentoCellsBuilder } from "../widgets/BentoCellsBuilder";
import { StatsBuilder } from "../widgets/StatsBuilder";
import { TrustStripIconsBuilder } from "../widgets/TrustStripIconsBuilder";

interface AutoFormProps {
  schema: z.ZodType<unknown>;
  // Accept any object — internally we read fields by name as `Record<string, unknown>`,
  // but inferred Zod types (e.g. `AccordionItem`) lack an index signature, so the
  // public prop is widened to `object` to avoid forcing every caller to cast.
  values: object;
  onChange: (fieldName: string, value: unknown) => void;
  blockKind: string;
  blockProps?: unknown;
}

interface FieldMapping {
  type:
    | "string"
    | "number"
    | "boolean"
    | "enum"
    | "array"
    | "object"
    | "unknown";
  zodType: z.ZodType<unknown>;
  isOptional?: boolean;
  isArray?: boolean;
  maxLength?: number;
  minLength?: number;
  enumValues?: (string | number)[];
}

type FieldDispatch = (
  fieldName: string,
  schema: FieldMapping,
  values: Record<string, unknown>,
  onChange: (fieldName: string, value: unknown) => void,
  override: FieldOverride | undefined,
  blockKind: string,
) => ReactNode | null;

/** Heuristic field name patterns that trigger specific pickers. */
const PICKER_HEURISTICS = {
  image:
    /(image|photo|picture|cover|hero|background|logo|favicon|avatar|thumbnail|src|videoUrl)$/i,
  product: /(productIds?|productId)$/i,
  category: /(categoryIds?|categoryId)$/i,
  page: /(pageId|href|link)$/i,
  icon: /(icon|iconName)$/i,
  color: /color$/i,
};

/**
 * Introspect a Zod schema and return field metadata.
 * Unwraps optional, default, lazy layers.
 */
function introspectZod(schema: z.ZodType<unknown>): FieldMapping {
  let current = schema;
  let isOptional = false;

  while (true) {
    if (current instanceof z.ZodOptional) {
      isOptional = true;
      current = current.unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = current.removeDefault();
    } else if (current instanceof z.ZodLazy) {
      current = (current._def as unknown as { schema: z.ZodType<unknown> })
        .schema;
    } else {
      break;
    }
  }

  // String
  if (current instanceof z.ZodString) {
    const maxLength = current._def.checks?.find((c) => c.kind === "max")?.value;
    const minLength = current._def.checks?.find((c) => c.kind === "min")
      ?.value as number | undefined;
    return {
      type: "string",
      zodType: schema,
      isOptional,
      maxLength: maxLength as number | undefined,
      minLength,
    };
  }

  // Number
  if (current instanceof z.ZodNumber) {
    return { type: "number", zodType: schema, isOptional };
  }

  // Boolean
  if (current instanceof z.ZodBoolean) {
    return { type: "boolean", zodType: schema, isOptional };
  }

  // Enum or literal union
  if (current instanceof z.ZodEnum) {
    return {
      type: "enum",
      zodType: schema,
      isOptional,
      enumValues: current._def.values,
    };
  }

  // Handle z.union of literals (discriminated union pattern)
  if (current instanceof z.ZodUnion) {
    const literals = (current._def as { options: unknown[] }).options.filter(
      (opt) => opt instanceof z.ZodLiteral,
    ) as z.ZodLiteral<string | number>[];
    if (literals.length === current._def.options.length) {
      return {
        type: "enum",
        zodType: schema,
        isOptional,
        enumValues: literals.map((lit) => lit._def.value),
      };
    }
  }

  // Array
  if (current instanceof z.ZodArray) {
    const elementSchema = current._def.type;
    // Array of strings
    if (elementSchema instanceof z.ZodString) {
      return {
        type: "array",
        zodType: schema,
        isOptional,
        isArray: true,
      };
    }
    // Array of objects — fall through to generic object handler
    if (elementSchema instanceof z.ZodObject) {
      return {
        type: "object",
        zodType: schema,
        isOptional,
        isArray: true,
      };
    }
  }

  // Object
  if (current instanceof z.ZodObject) {
    return { type: "object", zodType: schema, isOptional };
  }

  // Fallback
  return { type: "unknown", zodType: schema, isOptional };
}

/**
 * Detect if a field name suggests a specific picker widget.
 */
function detectPickerForFieldName(
  fieldName: string,
  fieldType: string,
): string | null {
  if (fieldType === "string") {
    if (PICKER_HEURISTICS.image.test(fieldName)) return "MediaPicker";
    if (PICKER_HEURISTICS.product.test(fieldName)) return "ProductPicker";
    if (PICKER_HEURISTICS.category.test(fieldName)) return "CategoryPicker";
    if (PICKER_HEURISTICS.page.test(fieldName)) return "PagePicker";
    if (PICKER_HEURISTICS.icon.test(fieldName)) return "IconPicker";
    if (PICKER_HEURISTICS.color.test(fieldName)) return "ColorField";
  }
  return null;
}

/**
 * Dispatch a field component based on the schema type and overrides.
 */
const fieldDispatchers: Record<string, FieldDispatch> = {
  string: (fieldName, mapping, values, onChange, override, _blockKind) => {
    // Check override widget first
    if (override?.widget) {
      switch (override.widget) {
        case "MediaPicker":
          return (
            <MediaPicker
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
              helpText={override.helpText}
            />
          );
        case "ProductPicker":
          return (
            <ProductPicker
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
            />
          );
        case "CategoryPicker":
          return (
            <CategoryPicker
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
            />
          );
        case "PagePicker":
          return (
            <PagePicker
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
            />
          );
        case "IconPicker":
          return (
            <IconPicker
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
            />
          );
        case "ColorField":
          return (
            <ColorField
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
              helpText={override.helpText}
            />
          );
        case "textarea":
          return (
            <TextAreaField
              key={fieldName}
              value={(values[fieldName] as string) || ""}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
              helpText={override.helpText}
              maxLength={mapping.maxLength}
            />
          );
        case "slider":
          return (
            <SliderField
              key={fieldName}
              value={(values[fieldName] as number) || 0}
              onChange={(val) => onChange(fieldName, val)}
              label={override.label}
              helpText={override.helpText}
            />
          );
      }
    }

    // Auto-detect picker from field name
    const pickerType = detectPickerForFieldName(fieldName, "string");
    if (pickerType === "MediaPicker") {
      return (
        <MediaPicker
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
          helpText={override?.helpText}
        />
      );
    }
    if (pickerType === "ProductPicker") {
      return (
        <ProductPicker
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
        />
      );
    }
    if (pickerType === "CategoryPicker") {
      return (
        <CategoryPicker
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
        />
      );
    }
    if (pickerType === "PagePicker") {
      return (
        <PagePicker
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
        />
      );
    }
    if (pickerType === "IconPicker") {
      return (
        <IconPicker
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
        />
      );
    }
    if (pickerType === "ColorField") {
      return (
        <ColorField
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
          helpText={override?.helpText}
        />
      );
    }

    // Use textarea for long strings
    if ((mapping.maxLength ?? 0) > 200) {
      return (
        <TextAreaField
          key={fieldName}
          value={(values[fieldName] as string) || ""}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
          helpText={override?.helpText}
          maxLength={mapping.maxLength}
        />
      );
    }

    // Default to text input
    return (
      <StringField
        key={fieldName}
        value={(values[fieldName] as string) || ""}
        onChange={(val) => onChange(fieldName, val)}
        label={override?.label}
        helpText={override?.helpText}
        maxLength={mapping.maxLength}
      />
    );
  },

  number: (fieldName, mapping, values, onChange, override) => {
    if (override?.widget === "slider") {
      return (
        <SliderField
          key={fieldName}
          value={(values[fieldName] as number) || 0}
          onChange={(val) => onChange(fieldName, val)}
          label={override.label}
          helpText={override.helpText}
        />
      );
    }
    return (
      <NumberField
        key={fieldName}
        value={(values[fieldName] as number) || 0}
        onChange={(val) => onChange(fieldName, val)}
        label={override?.label}
        helpText={override?.helpText}
      />
    );
  },

  boolean: (fieldName, _mapping, values, onChange, override) => (
    <BooleanField
      key={fieldName}
      value={(values[fieldName] as boolean) || false}
      onChange={(val) => onChange(fieldName, val)}
      label={override?.label}
      helpText={override?.helpText}
    />
  ),

  enum: (fieldName, mapping, values, onChange, override) => (
    <EnumField
      key={fieldName}
      value={(values[fieldName] as string) || ""}
      onChange={(val) => onChange(fieldName, val)}
      options={mapping.enumValues || []}
      label={override?.label}
      helpText={override?.helpText}
    />
  ),

  array: (fieldName, mapping, values, onChange, override) => (
    <ArrayOfStringsField
      key={fieldName}
      value={(values[fieldName] as string[]) || []}
      onChange={(val) => onChange(fieldName, val)}
      label={override?.label}
      helpText={override?.helpText}
    />
  ),

  object: () => null, // Arrays of objects handled separately
  unknown: (fieldName, _mapping, values, onChange, override) => (
    <JsonFallbackField
      key={fieldName}
      value={values[fieldName]}
      onChange={(val) => onChange(fieldName, val)}
      label={override?.label}
      helpText={override?.helpText}
    />
  ),
};

// Each bespoke widget owns a strongly-typed `value` shape (e.g. NavMenuItem[]).
// The registry stores them under a loose signature so AutoForm can dispatch by
// string key — the per-widget sub-form re-narrows the type at the boundary.
type LooseWidget = React.ComponentType<{
  value: unknown;
  onChange: (val: unknown) => void;
  label?: string;
}>;

const widgetRegistry: Record<string, LooseWidget> = {
  NavMenuBuilder: NavMenuBuilder as unknown as LooseWidget,
  FooterColumnsBuilder: FooterColumnsBuilder as unknown as LooseWidget,
  FormFieldsBuilder: FormFieldsBuilder as unknown as LooseWidget,
  GalleryBuilder: GalleryBuilder as unknown as LooseWidget,
  LookbookPinsBuilder: LookbookPinsBuilder as unknown as LooseWidget,
  SizeGuideMatrixBuilder: SizeGuideMatrixBuilder as unknown as LooseWidget,
  CollectionCardsBuilder: CollectionCardsBuilder as unknown as LooseWidget,
  PriceTiersBuilder: PriceTiersBuilder as unknown as LooseWidget,
  AccordionItemsBuilder: AccordionItemsBuilder as unknown as LooseWidget,
  TabsItemsBuilder: TabsItemsBuilder as unknown as LooseWidget,
  TestimonialsBuilder: TestimonialsBuilder as unknown as LooseWidget,
  FaqBuilder: FaqBuilder as unknown as LooseWidget,
  BentoCellsBuilder: BentoCellsBuilder as unknown as LooseWidget,
  StatsBuilder: StatsBuilder as unknown as LooseWidget,
  TrustStripIconsBuilder: TrustStripIconsBuilder as unknown as LooseWidget,
};

export function AutoForm({
  schema,
  values,
  onChange,
  blockKind,
}: AutoFormProps) {
  // Extract object shape from the schema
  const shape = useMemo(() => {
    let current = schema;
    while (
      current instanceof z.ZodOptional ||
      current instanceof z.ZodDefault ||
      current instanceof z.ZodLazy
    ) {
      if (current instanceof z.ZodOptional) {
        current = current.unwrap();
      } else if (current instanceof z.ZodDefault) {
        current = current.removeDefault();
      } else if (current instanceof z.ZodLazy) {
        current = (current._def as unknown as { schema: z.ZodType<unknown> })
          .schema;
      }
    }
    if (current instanceof z.ZodObject) {
      return current.shape;
    }
    return {};
  }, [schema]);

  // Render each field
  const fields = Object.entries(shape).map(([fieldName, fieldSchema]) => {
    const mapping = introspectZod(fieldSchema as z.ZodType<unknown>);
    const override = getFieldOverride(blockKind, fieldName);

    const valuesRecord = values as Record<string, unknown>;

    // Check if a custom widget is requested
    if (override?.widget) {
      const WidgetComponent = widgetRegistry[override.widget];
      if (WidgetComponent) {
        return (
          <WidgetComponent
            key={fieldName}
            value={(valuesRecord[fieldName] as unknown) || []}
            onChange={(val: unknown) => onChange(fieldName, val)}
            label={override.label}
          />
        );
      }
    }

    const dispatcher = fieldDispatchers[mapping.type];

    if (!dispatcher) {
      return (
        <JsonFallbackField
          key={fieldName}
          value={valuesRecord[fieldName]}
          onChange={(val) => onChange(fieldName, val)}
          label={override?.label}
          helpText={override?.helpText}
        />
      );
    }

    return dispatcher(
      fieldName,
      mapping,
      valuesRecord,
      onChange,
      override,
      blockKind,
    );
  });

  return <div className="space-y-4">{fields}</div>;
}
