import {
  EnvFeature,
  EnvFeaturePageGuard,
  FeaturePageGuard,
} from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { MessagingPage } from "@/features/messaging";
import { Feature } from "@repo/shared";

export default function Messaging() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.MESSAGING}>
      <FeaturePageGuard feature={Feature.MESSAGING}>
        <PermissionGate perm="SETTINGS.MESSAGING.VIEW">
          <MessagingPage />
        </PermissionGate>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
