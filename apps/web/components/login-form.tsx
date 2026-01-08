"use client"

import { useAuth } from "@/hooks/useAuth"
import { useForm } from "@/hooks/useForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormValues {
  username: string
  password: string
}

/**
 * Login Form Component - Dumb component
 * 
 * Design decisions:
 * - No API calls (handled by useAuth)
 * - No validation logic (handled by useForm)
 * - Only UI rendering and event binding
 * - All logic lives in hooks
 */
export default function LoginForm() {
  const { login } = useAuth()
  
  const form = useForm<LoginFormValues>({
    initialValues: {
      username: "",
      password: "",
    },
    validate: (values) => {
      const errors: Record<string, string> = {}
      if (!values.username.trim()) {
        errors.username = "Username is required"
      }
      if (!values.password) {
        errors.password = "Password is required"
      }
      return Object.keys(errors).length > 0 ? errors : null
    },
    onSubmit: async (values) => {
      await login({
        username: values.username,
        password: values.password,
      })
    },
  })

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={form.values.username}
              onChange={(e) => form.handleChange("username", e.target.value)}
              disabled={form.isLoading}
              required
            />
            {form.errors.username && (
              <p className="text-sm text-destructive">{form.errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={form.values.password}
              onChange={(e) => form.handleChange("password", e.target.value)}
              disabled={form.isLoading}
              required
            />
            {form.errors.password && (
              <p className="text-sm text-destructive">{form.errors.password}</p>
            )}
          </div>

          {form.errors._form && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {form.errors._form}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={form.isLoading}>
            {form.isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}