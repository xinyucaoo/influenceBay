"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Tag,
  Megaphone,
  Users,
  Building2,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INFLUENCER_NAV: NavItem[] = [
  { href: "/dashboard/influencer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/listings", label: "My Offers", icon: Tag },
  { href: "/campaigns", label: "Find Campaigns", icon: Megaphone },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
];

const INFLUENCER_NAV_SECONDARY: NavItem[] = [
  { href: "/influencers", label: "Browse Influencers", icon: Users },
  { href: "/brands", label: "Brands", icon: Building2 },
];

const BRAND_NAV: NavItem[] = [
  { href: "/dashboard/brand", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/campaigns", label: "My Campaigns", icon: Megaphone },
  { href: "/listings", label: "Listings", icon: Tag },
  { href: "/influencers", label: "Find Influencers", icon: Users },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
];

const BRAND_NAV_SECONDARY: NavItem[] = [
  { href: "/brands", label: "Brands", icon: Building2 },
];

function NavItemButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ role }: { role: "INFLUENCER" | "BRAND" }) {
  const pathname = usePathname();

  const primaryNav = role === "INFLUENCER" ? INFLUENCER_NAV : BRAND_NAV;
  const secondaryNav =
    role === "INFLUENCER" ? INFLUENCER_NAV_SECONDARY : BRAND_NAV_SECONDARY;

  const isActive = (href: string) => {
    if (href === "/dashboard/influencer" || href === "/dashboard/brand") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar
      collapsible="none"
      side="left"
      className="hidden md:flex min-h-svh shrink-0 flex-col border-r"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => (
                <NavItemButton
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Discover</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <NavItemButton
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
