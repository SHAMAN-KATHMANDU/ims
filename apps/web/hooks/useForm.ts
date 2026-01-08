"use client"

import { useState, useCallback, type FormEvent } from "react"

interface UseFormOptions<T> {
  onSubmit: (values: T) => Promise<void> | void
  initialValues?: Partial<T>
  validate?: (values: T) => Record<string, string> | null
}

interface UseFormReturn<T> {
  values: T
  errors: Record<string, string>
  isLoading: boolean
  handleChange: (name: keyof T, value: string) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  reset: () => void
}

/**
 * Generic form state management hook
 */
export function useForm<T extends Record<string, string>>({
  onSubmit,
  initialValues = {},
  validate,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues as T)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = useCallback(
    (name: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value } as T))
      if (errors[name as string]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name as string]
          return newErrors
        })
      }
    },
    [errors]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setErrors({})

      if (validate) {
        const validationErrors = validate(values)
        if (validationErrors) {
          setErrors(validationErrors)
          return
        }
      }

      setIsLoading(true)
      try {
        await onSubmit(values)
      } catch (error: any) {
        setErrors({
          _form: error.message || "An error occurred. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [values, validate, onSubmit]
  )

  const reset = useCallback(() => {
    setValues(initialValues as T)
    setErrors({})
    setIsLoading(false)
  }, [initialValues])

  return {
    values,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
    reset,
  }
}