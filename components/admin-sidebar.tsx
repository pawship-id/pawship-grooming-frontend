"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  Tag,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const menuItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Options", href: "/admin/options", icon: Tag },
  { title: "Products", href: "/admin/products", icon: Package },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/pawship-navbar-logo.webp"
              alt="Pawship"
              width={100}
              height={32}
              style={{ width: "auto", height: "auto" }}
              className="h-8 w-auto group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            />
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                      onClick={handleMenuClick}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="group-data-[collapsible=icon]:hidden">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
