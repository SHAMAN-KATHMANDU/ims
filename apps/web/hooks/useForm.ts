"use client";

import { useState, useCallback, type FormEvent } from "react";

interface UseFormOptions<T> {
  onSubmit: (values: T) => Promise<void> | void;
  initialValues?: Partial<T>;
  validate?: (values: T) => Record<string, string> | null;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  isLoading: boolean;
  handleChange: (name: keyof T, value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
}

/**
 * Generic form state management hook
 */
export function useForm<T extends object>({
  onSubmit,
  initialValues = {},
  validate,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>(""); // Separate state for form-level errors
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = useCallback(
    (name: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }) as T);
      // Clear field-specific errors when user types
      if (errors[name as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as string];
          return newErrors;
        });
      }
      // Don't clear formError - it persists until next submit
    },
    [errors],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Clear all errors at start of submit
      setErrors({});
      setFormError("");

      if (validate) {
        const validationErrors = validate(values);
        if (validationErrors) {
          setErrors(validationErrors);
          return;
        }
      }

      setIsLoading(true);
      try {
        await onSubmit(values);
        // Clear errors on success
        setErrors({});
        setFormError("");
      } catch (error: unknown) {
        const err = error as { message?: string };
        // Set form-level error separately
        setFormError(err.message || "An error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [values, validate, onSubmit],
  );

  const reset = useCallback(() => {
    setValues(initialValues as T);
    setErrors({});
    setFormError("");
    setIsLoading(false);
  }, [initialValues]);

  return {
    values,
    errors: { ...errors, _form: formError }, // Merge formError into errors object
    isLoading,
    handleChange,
    handleSubmit,
    reset,
  };
}
