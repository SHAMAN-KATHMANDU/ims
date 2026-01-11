"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "@/hooks/useForm"
import { useAxios } from "@/hooks/useAxios"
import { Eye, EyeOff } from "lucide-react"
import { getAuthUser } from "@/utils/auth"

type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  [key: string]: string
}

export function SettingsPage() {
  const { toast } = useToast()
  const axios = useAxios()
  const currentUser = getAuthUser()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordForm = useForm<PasswordFormValues>({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: (values) => {
      const errors: Record<string, string> = {}
      if (!values.currentPassword) {
        errors.currentPassword = "Current password is required"
      }
      if (!values.newPassword) {
        errors.newPassword = "New password is required"
      } else if (values.newPassword.length < 6) {
        errors.newPassword = "Password must be at least 6 characters"
      }
      if (!values.confirmPassword) {
        errors.confirmPassword = "Please confirm your new password"
      } else if (values.newPassword !== values.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
      if (values.currentPassword === values.newPassword) {
        errors.newPassword = "New password must be different from current password"
      }
      return Object.keys(errors).length > 0 ? errors : null
    },
    onSubmit: async (values) => {
      try {
        if (!currentUser?.id) {
          toast({
            title: "Error",
            description: "User information not available. Please log in again.",
            variant: "destructive",
          })
          return
        }

        // Need to implement backend /auth/change-password 
        // Use the user update endpoint with current user's ID
        await axios.put(`/users/${currentUser.id}`, {
          password: values.newPassword,
          // Note: The API might not verify currentPassword, but we include it for future API support
          currentPassword: values.currentPassword,
        })
        
        toast({
          title: "Password changed successfully",
          description: "Your password has been updated.",
        })
        
        passwordForm.reset()
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to change password"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
      </div>

           {/* User Info Card (Read-only) - Moved to top */}
           <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Account Information</CardTitle>
          <CardDescription className="text-base">Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Username</Label>
              <div className="text-2xl font-semibold text-foreground">
                {currentUser?.username || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <div className="text-2xl font-semibold text-foreground capitalize">
                {currentUser?.role || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Account Created</Label>
              <div className="text-2xl font-semibold text-foreground">
                {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure. You must enter your current password to change it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={passwordForm.values.currentPassword}
                  onChange={(e) => passwordForm.handleChange("currentPassword", e.target.value)}
                  disabled={passwordForm.isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={passwordForm.isLoading}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordForm.errors.currentPassword && (
                <p className="text-sm text-destructive">{passwordForm.errors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={passwordForm.values.newPassword}
                  onChange={(e) => passwordForm.handleChange("newPassword", e.target.value)}
                  disabled={passwordForm.isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={passwordForm.isLoading}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordForm.errors.newPassword && (
                <p className="text-sm text-destructive">{passwordForm.errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={passwordForm.values.confirmPassword}
                  onChange={(e) => passwordForm.handleChange("confirmPassword", e.target.value)}
                  disabled={passwordForm.isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={passwordForm.isLoading}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordForm.errors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordForm.errors.confirmPassword}</p>
              )}
            </div>

            {passwordForm.errors._form && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                <strong>Error:</strong> {passwordForm.errors._form}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={passwordForm.isLoading}>
                {passwordForm.isLoading ? "Changing Password..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}