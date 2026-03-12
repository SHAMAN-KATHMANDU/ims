"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormEvent } from "react";
import type { UseFormReturn } from "@/hooks/useForm";
import { ProductFormSchema } from "../validation";
import type { ProductFormValues } from "../components/types";

interface UseProductFormAdapterOptions {
  onSubmit: (values: ProductFormValues) => Promise<void>;
  initialValues?: Partial<ProductFormValues>;
  /** Optional: merge additional errors (e.g. variation validation) into form.errors */
  getAdditionalErrors?: (values: ProductFormValues) => Record<string, string>;
}

/** Adapts react-hook-form to the deprecated UseFormReturn interface for ProductForm/tabs compatibility. */
export function useProductFormAdapter({
  onSubmit,
  initialValues = {},
  getAdditionalErrors,
}: UseProductFormAdapterOptions): UseFormReturn<ProductFormValues> {
  const defaultValues: ProductFormValues = {
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
  };

  const rhf = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  const values = rhf.watch();

  const handleChange = useCallback(
    (name: keyof ProductFormValues, value: string) => {
      rhf.setValue(name, value as never, { shouldValidate: true });
    },
    [rhf],
  );

  const errors = useMemo(() => {
    const errs = rhf.formState.errors;
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(errs)) {
      if (val && typeof val === "object" && "message" in val) {
        result[key] = String((val as { message?: string }).message ?? "");
      }
    }
    const additional = getAdditionalErrors?.(values) ?? {};
    return { ...result, ...additional };
  }, [rhf.formState.errors, getAdditionalErrors, values]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const isValid = await rhf.trigger();
      if (!isValid) return;
      await onSubmit(values);
    },
    [rhf, onSubmit, values],
  );

  const reset = useCallback(() => {
    rhf.reset(defaultValues);
  }, [rhf, defaultValues]);

  const setValues = useCallback(
    (vals: Partial<ProductFormValues> | ProductFormValues) => {
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
  };
}
