import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Products</h1>
        <p className="text-muted-foreground mt-2">Manage your products and inventory</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
          <CardDescription>Product content will be displayed here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Product content placeholder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
