"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }

    setPermission(Notification.permission);

    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Notification permission denied");
        setLoading(false);
        return;
      }

      // Get VAPID key
      const vapidRes = await fetch("/api/push/vapid-key");
      if (!vapidRes.ok) {
        toast.error("Push notifications not configured on this server");
        setLoading(false);
        return;
      }
      const { publicKey } = await vapidRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setSubscription(sub);
      toast.success("Notifications enabled!");
    } catch (err) {
      console.error("Push subscription failed:", err);
      toast.error("Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        setSubscription(null);
      }
      toast.success("Notifications disabled");
    } catch {
      toast.error("Failed to disable notifications");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <BellOff className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Not supported in this browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isEnabled = permission === "granted" && subscription !== null;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="size-5 text-primary" />
          ) : (
            <BellOff className="size-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              {isEnabled
                ? "Receive reminders and study notifications"
                : permission === "denied"
                ? "Blocked — update in browser settings"
                : "Get notified about reminders and due flashcards"}
            </p>
          </div>
        </div>
        <Button
          variant={isEnabled ? "outline" : "default"}
          size="sm"
          onClick={isEnabled ? handleDisable : handleEnable}
          disabled={loading || permission === "denied"}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isEnabled ? (
            "Disable"
          ) : (
            "Enable"
          )}
        </Button>
      </div>
    </div>
  );
}
