"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LogOut,
  Trash2,
  Sun,
  Moon,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Profile } from "@/types/database";
import { toast } from "sonner";

interface SettingsFormProps {
  profile: Profile | null;
  email: string;
  hasGoogleCalendar: boolean;
}

export function SettingsForm({ profile, email, hasGoogleCalendar }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (profile?.preferences?.theme as "light" | "dark") ?? "light"
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile?.id ?? "");

    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved");
      router.refresh();
    }
  }, [displayName, profile?.id, supabase, router]);

  const handleThemeToggle = useCallback(async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    // Apply theme to document
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    // Save to preferences
    const prefs = { ...(profile?.preferences ?? {}), theme: newTheme };
    await supabase
      .from("profiles")
      .update({ preferences: prefs, updated_at: new Date().toISOString() })
      .eq("id", profile?.id ?? "");

    toast.success(`Switched to ${newTheme} mode`);
  }, [theme, profile, supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [supabase, router]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "DELETE") return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      toast.error("Failed to delete account. Please contact support.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [deleteConfirmText, supabase, router]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Manage your display name and profile details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly className="bg-muted" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how the app looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "light" ? (
                <Sun className="size-5 text-amber-500" />
              ) : (
                <Moon className="size-5 text-blue-400" />
              )}
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Currently using {theme} mode
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleThemeToggle}>
              Switch to {theme === "light" ? "dark" : "light"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>Connected services and accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Sync events with Google Calendar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasGoogleCalendar ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-3.5" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <XCircle className="size-3.5" />
                  Not connected
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Account Actions */}
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-fit"
        >
          <LogOut className="size-4" />
          Log Out
        </Button>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" className="w-fit" />
            }
          >
            <Trash2 className="size-4" />
            Delete Account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone. All your data will
                be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="delete-confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE"}
              >
                Permanently Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
