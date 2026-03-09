"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Brain,
  LayoutDashboard,
  StickyNote,
  CheckSquare,
  BookOpen,
  Calendar,
  FolderKanban,
  Plane,
  Network,
  Lightbulb,
  Search,
  Sparkles,
  Settings,
  LogOut,
  Inbox,
  Bookmark,
  Layers,
  MessageCircle,
  Target,
  Timer,
  Grid3X3,
  BarChart3,
  Trash2,
  Moon,
  Sun,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/components/layout/theme-provider";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "AI Chat", href: "/chat", icon: MessageCircle },
];

const organizeNav = [
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Tasks", href: "/todos", icon: CheckSquare },
  { title: "Priority Matrix", href: "/matrix", icon: Grid3X3 },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Calendar", href: "/calendar", icon: Calendar },
];

const reflectNav = [
  { title: "Journal", href: "/journal", icon: BookOpen },
  { title: "Habits", href: "/habits", icon: Target },
  { title: "Focus Timer", href: "/focus", icon: Timer },
];

const learnNav = [
  { title: "Flashcards", href: "/flashcards", icon: Layers },
  { title: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { title: "Ideas", href: "/ideas", icon: Lightbulb },
  { title: "Connections", href: "/connections", icon: Network },
];

const moreNav = [
  { title: "Travel", href: "/travel", icon: Plane },
  { title: "Insights", href: "/insights", icon: BarChart3 },
  { title: "Weekly Digest", href: "/digest", icon: Sparkles },
  { title: "Search", href: "/search", icon: Search },
  { title: "Trash", href: "/trash", icon: Trash2 },
];

function getUserInitials(user: User): string {
  const meta = user.user_metadata;
  if (meta?.full_name) {
    return meta.full_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (meta?.name) {
    return meta.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return "U";
}

function getUserDisplayName(user: User): string {
  const meta = user.user_metadata;
  return meta?.full_name || meta?.name || user.email || "User";
}

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const setSearchOpen = useAppStore((state) => state.setSearchOpen);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Brain className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BrainSpace</span>
                <span className="truncate text-xs text-muted-foreground">
                  Your second brain
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {[
          { label: "Home", items: mainNav },
          { label: "Organize", items: organizeNav },
          { label: "Reflect", items: reflectNav },
          { label: "Learn", items: learnNav },
          { label: "More", items: moreNav },
        ].map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar size="sm">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url}
                    alt={getUserDisplayName(user)}
                  />
                  <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {getUserDisplayName(user)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={4}
                className="w-56"
              >
                <DropdownMenuItem
                  onSelect={() => router.push("/settings")}
                >
                  <Settings />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
