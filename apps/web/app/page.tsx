export default function Page() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ims.shamankathmandu.com";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Inventory Management System</h1>
        <p className="text-muted-foreground">
          Use your organization&apos;s link to sign in. You will have received a
          URL like:
        </p>
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
          {baseUrl}/<span className="text-muted-foreground">your-org</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Open that link in your browser, then log in with your username and
          password.
        </p>
        <p className="text-xs text-muted-foreground">
          If you don&apos;t have a link, contact your administrator.
        </p>
      </div>
    </div>
  );
}
