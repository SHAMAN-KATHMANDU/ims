"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Edit2, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Validation schema for user form
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user", "viewer"]),
  status: z.enum(["active", "inactive"]),
})

type UserFormData = z.infer<typeof userSchema>

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user" | "viewer"
  status: "active" | "inactive"
  createdAt: string
}

export function AdminSettings() {
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Admin User",
      email: "admin@shaman.com",
      role: "admin",
      status: "active",
      createdAt: "2024-01-01",
    },
    {
      id: "2",
      name: "Test User",
      email: "user@shaman.com",
      role: "user",
      status: "active",
      createdAt: "2024-01-05",
    },
  ])

  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "user",
      status: "active",
    },
  })

  const onSubmit = (data: UserFormData) => {
    if (editingId) {
      // Edit existing user
      setUsers(users.map((user) => 
        user.id === editingId 
          ? { 
              ...user, 
              name: data.name as string,
              email: data.email as string,
              role: data.role as "admin" | "user" | "viewer",
              status: data.status as "active" | "inactive",
            } 
          : user
      ))
      setEditingId(null)
    } else {
      // Add new user
      const createdAt: string = new Date().toISOString().substring(0, 10)
      const newUser: User = {
        id: Date.now().toString(),
        name: data.name as string,
        email: data.email as string,
        role: data.role as "admin" | "user" | "viewer",
        status: data.status as "active" | "inactive",
        createdAt,
      }
      setUsers([...users, newUser])
    }
    form.reset()
    setIsOpen(false)
  }

  const handleEdit = (user: User) => {
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    })
    setEditingId(user.id)
    setIsOpen(true)
  }

  const handleDelete = (id: string) => {
    setUsers(users.filter((user) => user.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">Manage system-wide settings and user accounts</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Manage Users</h2>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingId(null)
                    form.reset()
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit User" : "Add New User"}</DialogTitle>
                  <DialogDescription>
                    {editingId ? "Update user information" : "Create a new user account"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "user"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "active"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false)
                          setEditingId(null)
                          form.reset()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">{editingId ? "Update User" : "Add User"}</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>Total Users: {users.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="gap-1">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="text-destructive hover:text-destructive gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Configure role-based access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Admin</h3>
                  <p className="text-sm text-muted-foreground">Full access to all system features</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">User</h3>
                  <p className="text-sm text-muted-foreground">Access to dashboard and basic features</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Viewer</h3>
                  <p className="text-sm text-muted-foreground">Read-only access to analytics and reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Manage system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input value="SHAMAN Kathmandu" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Input value="Production" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value="1.0.0" readOnly />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
