"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Package, BarChart3, Settings, ChevronLeft, Shield } from "lucide-react"
import { Button } from "./ui/button"
import { getUserRole, type UserRole } from "@/utils/auth"
import { useMemo } from "react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, roles: ["user", "admin", "superAdmin"] },
  { href: "/dashboard/product", label: "Product", icon: Package, roles: ["user", "admin", "superAdmin"] },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "superAdmin"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["user", "admin", "superAdmin"] },
  { href: "/dashboard/admin", label: "Admin", icon: Shield, roles: ["superAdmin"] },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const userRole = getUserRole()

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    if (!userRole) return []
    return allNavItems.filter(item => item.roles.includes(userRole))
  }, [userRole])

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-sidebar transition-all duration-300",
        isOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {isOpen && <h1 className="text-xl font-bold text-primary">Dashboard</h1>}
        <Button variant="ghost" size="icon" onClick={onToggle} className="ml-auto">
          <ChevronLeft className={cn("h-5 w-5 transition-transform", !isOpen && "rotate-180")} />
        </Button>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground",
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
