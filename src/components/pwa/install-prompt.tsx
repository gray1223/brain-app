"use client";

import { useState, useEffect } from "react";
import { Download, X, Brain, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Already installed as PWA — never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as Record<string, unknown>).MSStream;
    const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    setIsIOS(isiOS);
    setIsMobile(mobile);

    // Check if user dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 3 days
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
    }

    if (isiOS || mobile) {
      // On mobile, show popup after a short delay
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }

    // Desktop — listen for the browser install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
    // On iOS tapping install just keeps the modal open showing instructions
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!show) return null;

  // --- Mobile: full-screen popup modal ---
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-sm animate-in slide-in-from-bottom-8 fade-in duration-300 rounded-t-2xl border-t bg-card px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-2xl sm:border sm:pb-6">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>

          {/* App icon + name */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Brain className="size-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Get the BrainSpace App</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add to your home screen for the best experience — instant
                access, full-screen, and works offline.
              </p>
            </div>
          </div>

          {isIOS ? (
            /* iOS: show step-by-step instructions */
            <div className="mt-5">
              <ol className="space-y-4 text-sm">
                <li className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    1
                  </span>
                  <span className="text-muted-foreground">
                    Tap{" "}
                    <Share className="inline size-4 -mt-0.5 text-foreground" />{" "}
                    <strong className="text-foreground">Share</strong> in the
                    toolbar below
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    2
                  </span>
                  <span className="text-muted-foreground">
                    Tap{" "}
                    <strong className="text-foreground">
                      Add to Home Screen
                    </strong>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    3
                  </span>
                  <span className="text-muted-foreground">
                    Tap <strong className="text-foreground">Add</strong>
                  </span>
                </li>
              </ol>
              <button
                onClick={handleDismiss}
                className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:opacity-90"
              >
                Got it
              </button>
            </div>
          ) : (
            /* Android / other mobile: one-tap install button */
            <div className="mt-6 space-y-3">
              <button
                onClick={handleInstall}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:opacity-90"
              >
                <Download className="size-5" />
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-center text-sm text-muted-foreground active:text-foreground"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Desktop: small bottom-right banner ---
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install BrainSpace</p>
          <p className="text-xs text-muted-foreground">
            Add as a desktop app for quick access
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
