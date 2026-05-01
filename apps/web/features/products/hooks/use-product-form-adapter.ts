"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEvent } from "react";
import { ProductFormSchema } from "../validation";
import type { ProductFormValues, UseFormReturn } from "../components/types";

interface UseProductFormAdapterOptions {
  onSubmit: (values: ProductFormValues) => Promise<void>;
  initialValues?: Partial<ProductFormValues>;
  /** Optional: merge additional errors (e.g. variation validation) into form.errors */
  getAdditionalErrors?: (values: ProductFormValues) => Record<string, string>;
}

const GENERAL_ADDITIONAL_KEYS = new Set([
  "name",
  "categoryId",
  "costPrice",
  "mrp",
]);

function shouldShowAdditionalError(
  key: string,
  attemptedWizardTabs: Set<string>,
): boolean {
  if (GENERAL_ADDITIONAL_KEYS.has(key)) {
    return attemptedWizardTabs.has("general");
  }
  if (key === "_form" || key.startsWith("variation_")) {
    return attemptedWizardTabs.has("variations");
  }
  return true;
}

/** Adapts react-hook-form to the deprecated UseFormReturn interface for ProductForm/tabs compatibility. */
export function useProductFormAdapter({
  onSubmit,
  initialValues = {},
  getAdditionalErrors,
}: UseProductFormAdapterOptions): UseFormReturn<ProductFormValues> {
  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      imsCode: "",
      name: "",
      categoryId: "",
      subCategory: "",
      description: "",
      length: "",
      breadth: "",
      height: "",
      weight: "",
      costPrice: "",
      mrp: "",
      vendorId: undefined,
      ...initialValues,
    }),
    [initialValues],
  );

  const rhf = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  const validatedFieldKeysRef = useRef<Set<string>>(new Set());
  const [validatedFieldsVersion, setValidatedFieldsVersion] = useState(0);

  const attemptedWizardTabsRef = useRef<Set<string>>(new Set());
  const [wizardAttemptVersion, setWizardAttemptVersion] = useState(0);

  const values = rhf.watch();

  const markValidatedKeys = useCallback((keys: string[]) => {
    for (const k of keys) {
      validatedFieldKeysRef.current.add(k);
    }
    setValidatedFieldsVersion((v) => v + 1);
  }, []);

  const triggerValidation = useCallback(
    async (fields?: (keyof ProductFormValues)[]) => {
      const ok =
        fields != null && fields.length > 0
          ? await rhf.trigger(fields)
          : await rhf.trigger();
      const keysToMark: string[] =
        fields != null && fields.length > 0
          ? (fields as string[])
          : (Object.keys(defaultValues) as string[]);
      markValidatedKeys(keysToMark);
      return ok;
    },
    [rhf, defaultValues, markValidatedKeys],
  );

  const recordWizardValidationAttempt = useCallback((tab: string) => {
    attemptedWizardTabsRef.current.add(tab);
    setWizardAttemptVersion((v) => v + 1);
  }, []);

  const revealAllWizardValidationErrors = useCallback(() => {
    attemptedWizardTabsRef.current = new Set(["general", "variations"]);
    markValidatedKeys(Object.keys(defaultValues) as string[]);
    setWizardAttemptVersion((v) => v + 1);
  }, [defaultValues, markValidatedKeys]);

  const handleChange = useCallback(
    (name: keyof ProductFormValues, value: string) => {
      rhf.setValue(name, value as never, { shouldDirty: true });
    },
    [rhf],
  );

  const errors = useMemo(() => {
    const { errors: errs, isSubmitted, touchedFields } = rhf.formState;
    const result: Record<string, string> = {};

    for (const [key, val] of Object.entries(errs)) {
      const showZod =
        isSubmitted ||
        Boolean(touchedFields[key as keyof ProductFormValues]) ||
        validatedFieldKeysRef.current.has(key);
      if (!showZod) continue;
      if (val && typeof val === "object" && "message" in val) {
        result[key] = String((val as { message?: string }).message ?? "");
      }
    }

    const rawAdditional = getAdditionalErrors?.(values) ?? {};
    const attemptedTabs = attemptedWizardTabsRef.current;
    const filteredAdditional: Record<string, string> = {};
    for (const [key, message] of Object.entries(rawAdditional)) {
      if (!message) continue;
      if (shouldShowAdditionalError(key, attemptedTabs)) {
        filteredAdditional[key] = message;
      }
    }

    // Ref-only validation state (refs above); these deps force recomputation when they bump.
    void validatedFieldsVersion;
    void wizardAttemptVersion;

    return { ...result, ...filteredAdditional };
  }, [
    rhf.formState,
    getAdditionalErrors,
    values,
    validatedFieldsVersion,
    wizardAttemptVersion,
  ]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const isValid = await rhf.trigger();
      markValidatedKeys(Object.keys(defaultValues) as string[]);
      if (!isValid) return;
      await onSubmit(values);
    },
    [rhf, onSubmit, values, defaultValues, markValidatedKeys],
  );

  const reset = useCallback(() => {
    validatedFieldKeysRef.current = new Set();
    attemptedWizardTabsRef.current = new Set();
    setValidatedFieldsVersion((v) => v + 1);
    setWizardAttemptVersion((v) => v + 1);
    rhf.reset(defaultValues);
  }, [rhf, defaultValues]);

  const setValues = useCallback(
    (vals: Partial<ProductFormValues> | ProductFormValues) => {
      validatedFieldKeysRef.current = new Set();
      attemptedWizardTabsRef.current = new Set();
      setValidatedFieldsVersion((v) => v + 1);
      setWizardAttemptVersion((v) => v + 1);
      rhf.reset({ ...defaultValues, ...vals });
    },
    [rhf, defaultValues],
  );

  return {
    values,
    errors,
    isLoading: rhf.formState.isSubmitting,
    handleChange,
    handleSubmit,
    reset,
    setValues,
    triggerValidation,
    recordWizardValidationAttempt,
    revealAllWizardValidationErrors,
  };
}
