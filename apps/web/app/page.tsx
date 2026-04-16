import { SlugEntryForm } from "@/features/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Page() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ims.shamankathmandu.com";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Inventory Management System</h1>
        <p className="text-muted-foreground">
          Use your organization&apos;s link to sign in. Enter your organization
          slug below:
        </p>
        <div className="flex justify-center">
          <SlugEntryForm />
        </div>
        <p className="text-xs text-muted-foreground">
          Example: <code className="font-mono">{baseUrl}/your-org</code>
        </p>
        <p className="text-sm text-muted-foreground">
          If you don&apos;t have a link, contact your administrator.
        </p>
      </div>
    </div>
  );
}
