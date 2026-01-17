import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">
          Welcome to Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Your home for managing everything in one place
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Card {i}</CardTitle>
              <CardDescription>
                Placeholder content for home page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Content will be added here based on your requirements.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
