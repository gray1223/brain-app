"use client";

import { Brain, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Brain className="size-8" />
      </div>
      <WifiOff className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        BrainSpace needs an internet connection. Please check your connection
        and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </div>
  );
}
