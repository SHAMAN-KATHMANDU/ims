"use client";

/**
 * Self-service password change mutation.
 *
 * Wraps `changeMyPassword` from the auth service. onSuccess/onError are left
 * to the caller (the dialog) so it can surface per-status UI (field errors
 * on 401, rate-limit toast on 429, etc.).
 */

import { useMutation } from "@tanstack/react-query";
import {
  changeMyPassword,
  type ChangeMyPasswordData,
  type ChangeMyPasswordResponse,
} from "@/features/auth";

export function useChangeMyPassword() {
  return useMutation<ChangeMyPasswordResponse, Error, ChangeMyPasswordData>({
    mutationFn: changeMyPassword,
  });
}
