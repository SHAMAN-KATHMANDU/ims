"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getMessagingChannels,
  registerManualWebhookVerify,
  completeManualMessagingChannel,
  type RegisterManualWebhookVerifyPayload,
  type CompleteManualConnectPayload,
} from "../services/messaging.service";

export const messagingChannelKeys = {
  all: ["messaging-channels"] as const,
  lists: () => [...messagingChannelKeys.all, "list"] as const,
};

export function useMessagingChannels(options?: { enabled?: boolean }) {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  return useQuery({
    queryKey: messagingChannelKeys.lists(),
    queryFn: () => getMessagingChannels(),
    enabled: messagingEnabled && options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useRegisterManualWebhookVerify() {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterManualWebhookVerifyPayload) => {
      if (!messagingEnabled) throw new Error("Feature disabled: MESSAGING");
      return registerManualWebhookVerify(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: messagingChannelKeys.all,
      });
      toast.success(
        "Verify token saved. Confirm in Meta, then enter page credentials.",
      );
    },
  });
}

export function useCompleteManualMessagingChannel() {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      channelId: string;
      payload: CompleteManualConnectPayload;
    }) => {
      if (!messagingEnabled) throw new Error("Feature disabled: MESSAGING");
      return completeManualMessagingChannel(args.channelId, args.payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: messagingChannelKeys.all,
      });
      toast.success("Messenger channel connected");
    },
  });
}
