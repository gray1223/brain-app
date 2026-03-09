import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-6" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <SettingsForm
        profile={profile}
        email={user.email ?? ""}
        hasGoogleCalendar={!!user.app_metadata?.providers?.includes("google")}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <NotificationSettings />
      </div>
    </div>
  );
}
