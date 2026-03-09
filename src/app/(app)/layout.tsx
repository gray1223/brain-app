import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchCommand } from "@/components/layout/search-command";
import { QuickCapture } from "@/components/layout/quick-capture";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Ensure profile exists (handles users created before schema was set up)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      display_name: user.email?.split("@")[0] ?? "User",
    });
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-6 md:pb-6">{children}</main>
      </SidebarInset>
      <MobileNav />
      <SearchCommand />
      <QuickCapture />
      <KeyboardShortcuts />
      <Toaster />
    </SidebarProvider>
  );
}
