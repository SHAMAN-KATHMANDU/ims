import {
  EnvFeature,
  EnvFeaturePageGuard,
  FeaturePageGuard,
} from "@/features/flags";
import { MessagingPage } from "@/features/messaging";
import { Feature } from "@repo/shared";

export default function Messaging() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.MESSAGING}>
      <FeaturePageGuard feature={Feature.MESSAGING}>
        <MessagingPage />
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
