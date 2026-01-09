"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Edit2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "@/hooks/useForm"
import { useUsers, type User, type CreateUserData, type UpdateUserData } from "@/hooks/useUser"
import { getUserRole } from "@/utils/auth"

type UserFormValues = {
  username: string
  password: string
  role: "superAdmin" | "admin" | "user"
}

export function UsersPage() {
  const { users, isLoading, createUser, updateUser, deleteUser } = useUsers()
  const { toast } = useToast()
  const userRole = getUserRole()

  // Only superAdmin can access this page
  if (userRole !== "superAdmin") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const [userDialog, setUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const validateUser = (values: UserFormValues) => {
    const errors: Record<string, string> = {}
    if (!values.username?.trim()) errors.username = "Username is required"
    if (!editingUser && !values.password?.trim()) {
      errors.password = "Password is required"
    }
    if (values.password && values.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    if (!values.role) errors.role = "Role is required"
    return Object.keys(errors).length > 0 ? errors : null
  }

  const userForm = useForm<UserFormValues>({
    initialValues: {
      username: "",
      password: "",
      role: "user",
    },
    validate: validateUser,
    onSubmit: async (values) => {
      try {
        if (editingUser) {
          const updateData: UpdateUserData = {
            username: values.username,
            role: values.role,
          }
          if (values.password) {
            updateData.password = values.password
          }
          await updateUser(editingUser.id, updateData)
          toast({ title: "User updated successfully" })
        } else {
          const createData: CreateUserData = {
            username: values.username,
            password: values.password,
            role: values.role,
          }
          await createUser(createData)
          toast({ title: "User created successfully" })
        }
        setUserDialog(false)
        setEditingUser(null)
        userForm.reset()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save user",
          variant: "destructive",
        })
      }
    },
  })

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    userForm.values.username = user.username
    userForm.values.role = user.role
    userForm.values.password = "" // Don't pre-fill password
    setUserDialog(true)
  }

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id)
        toast({ title: "User deleted successfully" })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage users and their roles</p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Users</h2>
        <Dialog open={userDialog} onOpenChange={setUserDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingUser(null)
                userForm.reset()
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={userForm.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={userForm.values.username}
                  onChange={(e) => userForm.handleChange("username", e.target.value)}
                />
                {userForm.errors.username && (
                  <p className="text-sm text-destructive">{userForm.errors.username}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.values.password}
                  onChange={(e) => userForm.handleChange("password", e.target.value)}
                />
                {userForm.errors.password && (
                  <p className="text-sm text-destructive">{userForm.errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={userForm.values.role}
                  onValueChange={(value) => userForm.handleChange("role", value as "superAdmin" | "admin" | "user")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superAdmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                {userForm.errors.role && (
                  <p className="text-sm text-destructive">{userForm.errors.role}</p>
                )}
              </div>
              {userForm.errors._form && <p className="text-sm text-destructive">{userForm.errors._form}</p>}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setUserDialog(false)
                    userForm.reset()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={userForm.isLoading}>
                  {userForm.isLoading ? "Saving..." : editingUser ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Total: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
