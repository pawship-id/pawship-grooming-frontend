"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  Tag,
  Percent,
  Store,
  Scissors,
  ImageIcon,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  CreditCard,
  Sparkles,
  FileBarChart2,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const menuItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  {
    title: "Booking Calendar",
    href: "/admin/bookings/calendar",
    icon: CalendarRange,
  },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Stores", href: "/admin/stores", icon: Store },
  { title: "Services", href: "/admin/services", icon: Scissors },
  { title: "Memberships", href: "/admin/memberships", icon: CreditCard },
  {
    title: "Pet Memberships",
    href: "/admin/pet-memberships",
    icon: Sparkles,
  },
  { title: "Promotions", href: "/admin/promotions", icon: Percent },
  { title: "Options", href: "/admin/options", icon: Tag },
  { title: "Banners", href: "/admin/banners", icon: ImageIcon },
];

const reportSubItems = [
  { title: "Report Index", href: "/admin/reports" },
  { title: "Financial", href: "/admin/reports/financial" },
  { title: "Operations", href: "/admin/reports/operations" },
  { title: "Customer", href: "/admin/reports/customer" },
  { title: "Membership", href: "/admin/reports/membership" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isReportsActive = pathname.startsWith("/admin/reports");
  const [reportsOpen, setReportsOpen] = useState(isReportsActive);

  // Highlight only the most specific matching item — prevents the
  // "Bookings" parent route from staying active on nested pages like
  // "Booking Calendar" which is a sibling-level entry.
  const activeHref = menuItems
    .map((m) => m.href)
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
                  <SidebarMenuButton
                    asChild
                    isActive={activeHref === item.href}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 group-data-[collapsible=icon]:justify-center`}
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

              {/* Reports collapsible */}
              <SidebarMenuItem>
                <Collapsible
                  open={reportsOpen}
                  onOpenChange={setReportsOpen}
                  className="group/collapsible w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isReportsActive}
                      className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center"
                      tooltip="Reports"
                    >
                      <FileBarChart2 className="h-4 w-4 shrink-0" />
                      <span className="flex-1 group-data-[collapsible=icon]:hidden">
                        Reports
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden group/collapsible:data-[state=open]:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {reportSubItems.map((sub) => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === sub.href}
                          >
                            <Link href={sub.href} onClick={handleMenuClick}>
                              {sub.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">
              {user?.name}
            </span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
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
          <Link
            href="/admin/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            title="My Profile"
          >
            <UserCircle className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">
              My Profile
            </span>
          </Link>
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
  );
}
