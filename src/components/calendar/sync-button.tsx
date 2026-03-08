"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    // Check if user has a Google provider token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      // No Google token — need to link Google account via OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/calendar`,
          scopes: "https://www.googleapis.com/auth/calendar.readonly",
        },
      });
      if (error) {
        setMessage(`Error: ${error.message}`);
        setLoading(false);
      }
      // Will redirect to Google OAuth
      return;
    }

    // Has token — call the sync API
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Synced ${data.synced} events`);
        router.refresh();
      }
    } catch {
      setMessage("Failed to sync");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleSync} disabled={loading}>
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync with Google"}
      </Button>
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
