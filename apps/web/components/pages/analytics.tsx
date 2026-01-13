import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your performance and insights
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader>
              <CardTitle>Metric {i}</CardTitle>
              <CardDescription>Analytics data placeholder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground">Chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
