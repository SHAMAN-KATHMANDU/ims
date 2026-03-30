import { AuthGuard } from "@/components/auth/auth-guard";
import { MediaLibraryPage } from "@/views/media/MediaLibraryPage";

/** Tenant media library — authenticated users. */
export default function MediaRoute() {
  return (
    <AuthGuard>
      <MediaLibraryPage />
    </AuthGuard>
  );
}
