import { MessagingProvider } from "@prisma/client";
import type { MessagingProviderInterface } from "./messaging-provider.interface";
import { MessengerProvider } from "./messenger.provider";

const providers = new Map<MessagingProvider, MessagingProviderInterface>();

export function getProvider(
  provider: MessagingProvider,
): MessagingProviderInterface {
  if (!providers.has(provider)) {
    switch (provider) {
      case "FACEBOOK_MESSENGER":
        providers.set(provider, new MessengerProvider());
        break;
      default:
        throw new Error(`Unsupported messaging provider: ${provider}`);
    }
  }
  return providers.get(provider)!;
}
